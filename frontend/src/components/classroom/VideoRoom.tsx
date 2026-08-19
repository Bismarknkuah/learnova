'use client';
import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, Circle, Square } from 'lucide-react';

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

/**
 * Internal HD video room — peer-to-peer WebRTC (mesh) signalled over Socket.IO. No media server
 * needed for small classes. Supports camera/mic, screen share, and local session recording.
 * (For large rooms an SFU like LiveKit is still the scalable path; this covers 1:1 & small groups.)
 */
export function VideoRoom({ socket, sessionId, audioOnly = false }: { socket: Socket | null; sessionId: string; audioOnly?: boolean }) {
  const localRef = useRef<HTMLVideoElement | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [remotes, setRemotes] = useState<{ id: string; stream: MediaStream }[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);

  const addRemote = (id: string, stream: MediaStream) =>
    setRemotes((r) => (r.find((x) => x.id === id) ? r : [...r, { id, stream }]));
  const dropRemote = (id: string) => setRemotes((r) => r.filter((x) => x.id !== id));

  const makePeer = (id: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE);
    localStream.current?.getTracks().forEach((t) => pc.addTrack(t, localStream.current!));
    pc.onicecandidate = (e) => { if (e.candidate) socket?.emit('rtc:signal', { to: id, data: { candidate: e.candidate } }); };
    pc.ontrack = (e) => addRemote(id, e.streams[0]);
    pc.onconnectionstatechange = () => { if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) dropRemote(id); };
    peers.current.set(id, pc);
    return pc;
  };

  useEffect(() => {
    if (!socket) return;
    let mounted = true;
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia(audioOnly ? { video: false, audio: true } : { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: true }).catch(() => null);
      if (!stream || !mounted) return;
      localStream.current = stream;
      if (localRef.current) localRef.current.srcObject = stream;
      socket.emit('rtc:join', { sessionId });
    })();

    // New joiner calls existing peers.
    const onPeers = async ({ peers: ids }: { peers: string[] }) => {
      for (const id of ids) {
        const pc = makePeer(id);
        const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
        socket.emit('rtc:signal', { to: id, data: { sdp: pc.localDescription } });
      }
    };
    const onSignal = async ({ from, data }: { from: string; data: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } }) => {
      let pc = peers.current.get(from) ?? makePeer(from);
      if (data.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (data.sdp.type === 'offer') {
          const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
          socket.emit('rtc:signal', { to: from, data: { sdp: pc.localDescription } });
        }
      } else if (data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
      }
    };
    const onLeft = ({ id }: { id: string }) => { peers.current.get(id)?.close(); peers.current.delete(id); dropRemote(id); };

    socket.on('rtc:peers', onPeers);
    socket.on('rtc:signal', onSignal);
    socket.on('rtc:peer-left', onLeft);
    return () => {
      mounted = false;
      socket.off('rtc:peers', onPeers); socket.off('rtc:signal', onSignal); socket.off('rtc:peer-left', onLeft);
      peers.current.forEach((p) => p.close()); peers.current.clear();
      localStream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [socket, sessionId, audioOnly]);

  const toggleMic = () => { const t = localStream.current?.getAudioTracks()[0]; if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); } };
  const toggleCam = () => { const t = localStream.current?.getVideoTracks()[0]; if (t) { t.enabled = !t.enabled; setCamOn(t.enabled); } };

  const shareScreen = async () => {
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = display.getVideoTracks()[0];
      peers.current.forEach((pc) => { const s = pc.getSenders().find((x) => x.track?.kind === 'video'); s?.replaceTrack(track); });
      if (localRef.current) localRef.current.srcObject = display;
      setSharing(true);
      track.onended = () => {
        const cam = localStream.current?.getVideoTracks()[0];
        peers.current.forEach((pc) => { const s = pc.getSenders().find((x) => x.track?.kind === 'video'); if (cam) s?.replaceTrack(cam); });
        if (localRef.current) localRef.current.srcObject = localStream.current;
        setSharing(false);
      };
    } catch { /* user cancelled */ }
  };

  const toggleRecord = () => {
    if (recording) { recorder.current?.stop(); setRecording(false); return; }
    if (!localStream.current) return;
    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(localStream.current, { mimeType: 'video/webm' });
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
      const a = document.createElement('a'); a.href = url; a.download = `class-${sessionId}.webm`; a.click();
      URL.revokeObjectURL(url);
    };
    rec.start(); recorder.current = rec; setRecording(true);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="relative">
          <video ref={localRef} autoPlay muted playsInline className="aspect-video w-full rounded-xl bg-black object-cover" />
          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-xs text-white">You{audioOnly ? ' · audio-only' : sharing ? ' · sharing' : ''}</span>
        </div>
        {remotes.map((r) => <RemoteTile key={r.id} stream={r.stream} />)}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button onClick={toggleMic} className={`rounded-xl p-2.5 ${micOn ? 'bg-gray-100' : 'bg-coral text-white'}`}>{micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</button>
        <button onClick={toggleCam} className={`rounded-xl p-2.5 ${camOn ? 'bg-gray-100' : 'bg-coral text-white'}`}>{camOn ? <VideoIcon className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}</button>
        <button onClick={shareScreen} className={`rounded-xl p-2.5 ${sharing ? 'bg-brand text-white' : 'bg-gray-100'}`}><MonitorUp className="h-4 w-4" /></button>
        <button onClick={toggleRecord} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm ${recording ? 'bg-coral text-white' : 'bg-gray-100'}`}>
          {recording ? <><Square className="h-4 w-4" /> Stop</> : <><Circle className="h-4 w-4" /> Record</>}
        </button>
      </div>
    </div>
  );
}

function RemoteTile({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return <video ref={ref} autoPlay playsInline className="aspect-video w-full rounded-xl bg-black object-cover" />;
}
