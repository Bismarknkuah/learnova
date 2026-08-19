'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Hand, Send, Video, FileText, X, Calculator, Mic, Square, Paperclip, Brain, Users, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { Whiteboard } from '@/components/classroom/Whiteboard';
import { VideoRoom } from '@/components/classroom/VideoRoom';
import { CameraAttention } from '@/components/classroom/CameraAttention';
import { useClassroomSocket } from '@/features/classroom/useClassroomSocket';
import { useJoin } from '@/features/classroom/useJoin';
import { useMe } from '@/features/profile/useMe';
import { Card } from '@/components/ui/Card';
import { solveEquation } from '@/lib/solveEquation';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface ChatMsg { id: string; name: string; msg?: string; voice?: string; dur?: number; file?: string; fileName?: string; mime?: string; ts: number }
interface Poll { question: string; options: string[]; votes: number[] }
interface Notes { summary: string; keyPoints: string[]; formulas: string[]; homework: string[]; unansweredQuestions: string[] }
interface Quiz { question: string; options: string[] }
const EMOJIS = ['👍', '👏', '❤️', '😮', '🎉', '❓'];

export default function ClassroomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: me } = useMe();
  useJoin(id);
  const isTeacher = me?.role === 'teacher';
  const socketRef = useClassroomSocket(id, me?.name ?? 'Guest');

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [msg, setMsg] = useState('');
  const [hands, setHands] = useState<string[]>([]);
  const [floats, setFloats] = useState<{ id: number; emoji: string }[]>([]);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [notes, setNotes] = useState<Notes | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);
  const [camAttention, setCamAttention] = useState(false);
  const [modPrompt, setModPrompt] = useState<string | null>(null);
  const attention = useRef<Map<string, { level: string; ts: number }>>(new Map());
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizResult, setQuizResult] = useState<{ correct: boolean; answer: number } | null>(null);
  const [breakouts, setBreakouts] = useState<string[] | null>(null);
  const [myBreakout, setMyBreakout] = useState<string | null>(null);
  const [eq, setEq] = useState(''); const [eqResult, setEqResult] = useState('');
  const [recording, setRecording] = useState(false);
  const voiceRec = useRef<MediaRecorder | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const lastActive = useRef<Map<string, number>>(new Map());
  const confused = useRef<Map<string, number>>(new Map());
  const [engagement, setEngagement] = useState({ engaged: 0, neutral: 0, confused: 0, total: 0 });

  useEffect(() => {
    const s = socketRef.current; if (!s) return;
    const mark = (id?: string, conf = false) => { if (!id) return; seenIds.current.add(id); lastActive.current.set(id, Date.now()); if (conf) confused.current.set(id, Date.now()); };
    const onChat = (m: ChatMsg) => { mark(m.id); setChat((c) => [...c, m]); };
    const onHand = (h: { name: string; id?: string }) => { mark(h.id); setHands((x) => [...x, h.name]); };
    const onEmoji = (e: { emoji: string; id?: string }) => {
      mark(e.id, e.emoji === '❓');
      const fid = Date.now() + Math.random();
      setFloats((f) => [...f, { id: fid, emoji: e.emoji }]);
      setTimeout(() => setFloats((f) => f.filter((x) => x.id !== fid)), 2500);
    };
    const onPollStart = (p: Poll) => setPoll(p);
    const onPollVote = ({ index }: { index: number }) => setPoll((p) => p ? { ...p, votes: p.votes.map((v, i) => i === index ? v + 1 : v) } : p);
    s.on('chat:message', onChat); s.on('chat:voice', onChat); s.on('chat:file', onChat);
    s.on('hand:raised', onHand); s.on('react:emoji', onEmoji);
    const onQuizStart = (q: Quiz) => { setQuiz(q); setQuizResult(null); };
    const onQuizResult = (r: { correct: boolean; answer: number }) => setQuizResult(r);
    const onBreakoutOpen = ({ rooms }: { rooms: string[] }) => setBreakouts(rooms);
    const onBreakoutClose = () => { setBreakouts(null); setMyBreakout(null); };
    const onBreakoutJoined = ({ breakout }: { breakout: string }) => setMyBreakout(breakout);
    s.on('poll:start', onPollStart); s.on('poll:vote', onPollVote);
    const onAttention = (a: { id: string; level: string }) => { attention.current.set(a.id, { level: a.level, ts: Date.now() }); seenIds.current.add(a.id); };
    s.on('attention:update', onAttention);
    const onMod = ({ action }: { action: string }) => { setModPrompt(action); setTimeout(() => setModPrompt(null), 9000); };
    s.on('moderator:request', onMod);
    s.on('quiz:start', onQuizStart); s.on('quiz:result', onQuizResult);
    s.on('breakout:open', onBreakoutOpen); s.on('breakout:close', onBreakoutClose); s.on('breakout:joined', onBreakoutJoined);
    return () => { s.off('chat:message', onChat); s.off('chat:voice', onChat); s.off('chat:file', onChat); s.off('hand:raised', onHand); s.off('react:emoji', onEmoji); s.off('poll:start', onPollStart); s.off('poll:vote', onPollVote); s.off('attention:update', onAttention); s.off('moderator:request', onMod); s.off('quiz:start', onQuizStart); s.off('quiz:result', onQuizResult); s.off('breakout:open', onBreakoutOpen); s.off('breakout:close', onBreakoutClose); s.off('breakout:joined', onBreakoutJoined); };
  }, [socketRef]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);
  useEffect(() => { if (token) api.post(`/classrooms/${id}/attendance`, { name: me?.name }, token).catch(() => {}); }, [id, token, me?.name]);

  // Engagement estimate from in-class activity (privacy-friendly — no facial analysis).
  useEffect(() => {
    if (!isTeacher) return;
    const t = setInterval(() => {
      const now = Date.now();
      const total = seenIds.current.size;
      let engaged = 0, conf = 0;
      for (const id of seenIds.current) {
        const att = attention.current.get(id);
        const attActive = att && att.ts > now - 10_000;
        const isConfused = (confused.current.get(id) ?? 0) > now - 120_000 || (attActive && att!.level === 'away');
        const isActive = (lastActive.current.get(id) ?? 0) > now - 45_000 || (attActive && att!.level === 'engaged');
        if (isConfused) conf++; else if (isActive) engaged++;
      }
      setEngagement({ engaged, confused: conf, neutral: Math.max(0, total - engaged - conf), total });
    }, 3000);
    return () => clearInterval(t);
  }, [isTeacher]);

  const send = () => { if (!msg.trim()) return; socketRef.current?.emit('chat:message', { sessionId: id, msg, breakout: myBreakout ?? undefined }); setMsg(''); };
  const raiseHand = () => socketRef.current?.emit('hand:raise', { sessionId: id });
  const react = (emoji: string) => socketRef.current?.emit('react:emoji', { sessionId: id, emoji });
  const startPoll = () => socketRef.current?.emit('poll:start', { sessionId: id, question: 'Did you understand this?', options: ['Yes', 'Not yet'] });
  const vote = (i: number) => socketRef.current?.emit('poll:vote', { sessionId: id, index: i });
  const startQuiz = () => socketRef.current?.emit('quiz:start', { sessionId: id, question: 'Newton’s 2nd law is?', options: ['F = ma', 'E = mc²', 'V = IR', 'a² + b² = c²'], answer: 0 });
  const answerQuiz = (i: number) => socketRef.current?.emit('quiz:answer', { sessionId: id, index: i });
  const openBreakouts = () => socketRef.current?.emit('breakout:open', { sessionId: id, rooms: ['1', '2', '3'] });
  const joinBreakout = (b: string) => socketRef.current?.emit('breakout:join', { sessionId: id, breakout: b });
  const closeBreakouts = () => socketRef.current?.emit('breakout:close', { sessionId: id });
  const solve = () => setEqResult(solveEquation(eq));

  // Voice note: record mic → base64 → broadcast
  const toggleVoice = async () => {
    if (recording) { voiceRec.current?.stop(); setRecording(false); return; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
    if (!stream) return;
    const chunks: BlobPart[] = []; const start = Date.now();
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const reader = new FileReader();
      reader.onloadend = () => socketRef.current?.emit('chat:voice', { sessionId: id, audio: reader.result, dur: Math.round((Date.now() - start) / 1000) });
      reader.readAsDataURL(new Blob(chunks, { type: 'audio/webm' }));
      stream.getTracks().forEach((t) => t.stop());
    };
    rec.start(); voiceRec.current = rec; setRecording(true);
  };

  // File share: read → base64 → broadcast (keep small)
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 3_000_000) { alert('Please share files under 3 MB.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => socketRef.current?.emit('chat:file', { sessionId: id, file: reader.result, fileName: f.name, mime: f.type });
    reader.readAsDataURL(f);
  };

  const generateNotes = async () => {
    setGenBusy(true);
    try {
      const transcript = chat.map((c) => `${c.name}: ${c.msg ?? '[media]'}`).join('\n') || 'A class on the lesson topic took place. Homework: practice exercises.';
      setNotes(await api.post<Notes>(`/classrooms/${id}/notes`, { title: 'Class', transcript }, token));
    } finally { setGenBusy(false); }
  };
  const [checkedIn, setCheckedIn] = useState(false);
  const voiceCheckIn = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
    if (!stream) { alert('Microphone needed for voice check-in.'); return; }
    const rec = new MediaRecorder(stream);
    rec.start();
    setTimeout(() => { rec.stop(); stream.getTracks().forEach((t) => t.stop()); }, 1500);
    rec.onstop = async () => {
      await api.post(`/classrooms/${id}/attendance`, { name: me?.name, method: 'voice' }, token).catch(() => {});
      setCheckedIn(true);
    };
  };
  const copyInvite = () => { const url = `${window.location.origin}/classroom/${id}`; navigator.clipboard.writeText(url); alert('Invite link copied — share it so students can join:\n' + url); };
  const askStudents = (action: string) => socketRef.current?.emit('moderator:request', { sessionId: id, action });
  const endSession = async () => { await api.post(`/classrooms/${id}/end`, {}, token); router.push(`/classroom/${id}/replay`); };

  const renderMsg = (c: ChatMsg, i: number) => (
    <div key={i} className="text-sm">
      <span className="font-medium text-brand">{c.name}:</span>{' '}
      {c.msg && <span dangerouslySetInnerHTML={{ __html: c.msg.replace(/(@\w+)/g, '<span class="text-brand font-medium">$1</span>') }} />}
      {c.voice && <audio controls src={c.voice} className="mt-1 h-8 w-full" />}
      {c.file && <a href={c.file} download={c.fileName} className="inline-flex items-center gap-1 text-brand underline"><Paperclip className="h-3 w-3" /> {c.fileName}</a>}
    </div>
  );

  return (
    <div className="relative space-y-4">
      <div className="pointer-events-none fixed bottom-24 right-1/3 z-50">{floats.map((f) => <div key={f.id} className="animate-float text-3xl">{f.emoji}</div>)}</div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink">Live class</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setVideoOn((v) => !v)} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium ${videoOn ? 'bg-brand text-white' : 'border border-gray-200 hover:border-brand'}`}><Video className="h-4 w-4" /> {videoOn ? 'Leave video' : 'Join video'}</button>
          <button onClick={() => setDataSaver((v) => !v)} className={`rounded-xl px-3 py-2 text-sm font-medium ${dataSaver ? 'bg-gold text-white' : 'border border-gray-200 hover:border-brand'}`}>{dataSaver ? 'Data saver: on' : 'Data saver'}</button>
          <button onClick={generateNotes} disabled={genBusy} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:border-brand"><FileText className="h-4 w-4" /> {genBusy ? 'Generating…' : 'AI notes'}</button>
          {!isTeacher && <button onClick={() => setCamAttention((v) => !v)} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium ${camAttention ? 'bg-brand text-white' : 'border border-gray-200 hover:border-brand'}`}>Attention {camAttention ? 'on' : 'opt-in'}</button>}
          {!isTeacher && <button onClick={voiceCheckIn} disabled={checkedIn} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:border-brand"><Mic className="h-4 w-4" /> {checkedIn ? 'Checked in ✓' : 'Voice check-in'}</button>}
          {isTeacher && <button onClick={startPoll} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:border-brand">Poll</button>}
          {isTeacher && <button onClick={startQuiz} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:border-brand"><Brain className="h-4 w-4" /> Quiz</button>}
          {isTeacher && <button onClick={breakouts ? closeBreakouts : openBreakouts} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:border-brand"><Users className="h-4 w-4" /> {breakouts ? 'Close rooms' : 'Breakouts'}</button>}
          {isTeacher && (
            <div className="relative inline-flex">
              <select onChange={(e) => { if (e.target.value) { askStudents(e.target.value); e.target.value=''; } }} defaultValue="" className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:border-brand">
                <option value="" disabled>Ask students…</option>
                <option value="unmute">🎤 Please unmute</option>
                <option value="camera">📹 Turn on camera</option>
                <option value="present">🖥️ Share your screen</option>
                <option value="attention">👀 Eyes on screen</option>
              </select>
            </div>
          )}
          {isTeacher && <button onClick={copyInvite} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:border-brand"><LinkIcon className="h-4 w-4" /> Invite link</button>}
          {isTeacher && <button onClick={endSession} className="rounded-xl bg-coral px-3 py-2 text-sm font-semibold text-white">End class</button>}
        </div>
      </div>

      {videoOn && <VideoRoom socket={socketRef.current} sessionId={id} audioOnly={dataSaver} />}

      {modPrompt && !isTeacher && (
        <div className="flex items-center justify-between rounded-2xl border border-gold/40 bg-gold-soft px-4 py-3">
          <p className="text-sm font-medium text-gold-dark">{modPrompt === 'unmute' ? '🎤 Your teacher asks you to unmute.' : modPrompt === 'camera' ? '📹 Your teacher asks you to turn on your camera.' : modPrompt === 'present' ? '🖥️ Your teacher invites you to share your screen.' : '👀 Your teacher asks for your attention.'}</p>
          <button onClick={() => setModPrompt(null)} className="rounded-lg bg-gold-dark px-3 py-1 text-xs font-semibold text-white">Got it</button>
        </div>
      )}

      {isTeacher && engagement.total > 0 && (() => {
        const pct = (n: number) => Math.round((n / engagement.total) * 100);
        return (
          <Card>
            <p className="mb-2 text-sm font-semibold text-ink">Live engagement <span className="font-normal text-ink-soft">· estimated from activity, {engagement.total} active</span></p>
            <div className="flex h-4 overflow-hidden rounded-full">
              <div className="bg-brand" style={{ width: `${pct(engagement.engaged)}%` }} />
              <div className="bg-gray-300" style={{ width: `${pct(engagement.neutral)}%` }} />
              <div className="bg-coral" style={{ width: `${pct(engagement.confused)}%` }} />
            </div>
            <div className="mt-2 flex gap-4 text-xs text-ink-soft">
              <span className="text-brand">{pct(engagement.engaged)}% Engaged</span>
              <span>{pct(engagement.neutral)}% Neutral</span>
              <span className="text-coral">{pct(engagement.confused)}% Confused</span>
            </div>
            <p className="mt-1 text-xs text-ink-soft">Confusion is inferred from ❓ reactions. Privacy: no camera analysis.</p>
          </Card>
        );
      })()}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Whiteboard socket={socketRef.current} sessionId={id} canDraw={!!isTeacher} />

          {/* Internal equation solver */}
          <Card>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink"><Calculator className="h-4 w-4 text-brand" /> Math solver</p>
            <div className="mt-2 flex gap-2">
              <input value={eq} onChange={(e) => setEq(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') solve(); }}
                placeholder="e.g. x^2 + 5x + 6 = 0" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand" />
              <button onClick={solve} className="rounded-lg bg-brand px-4 text-sm font-semibold text-white">Solve</button>
            </div>
            {eqResult && <p className="mt-2 font-mono text-sm text-brand">{eqResult}</p>}
          </Card>

          {quiz && (
            <Card>
              <p className="inline-flex items-center gap-2 font-semibold text-ink"><Brain className="h-4 w-4 text-violet-600" /> {quiz.question}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {quiz.options.map((o, i) => (
                  <button key={i} onClick={() => answerQuiz(i)} disabled={!!quizResult}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${quizResult && quizResult.answer === i ? 'border-brand bg-brand-soft text-brand' : 'border-gray-200 hover:border-brand'}`}>
                    {o}
                  </button>
                ))}
              </div>
              {quizResult && <p className={`mt-2 inline-flex items-center gap-1 text-sm font-medium ${quizResult.correct ? 'text-brand' : 'text-coral'}`}><CheckCircle className="h-4 w-4" /> {quizResult.correct ? 'Correct!' : 'Not quite — the right answer is highlighted.'}</p>}
            </Card>
          )}
          {breakouts && (
            <Card>
              <p className="inline-flex items-center gap-2 font-semibold text-ink"><Users className="h-4 w-4 text-brand" /> Breakout rooms {myBreakout && <span className="text-sm text-ink-soft">· you’re in room {myBreakout}</span>}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {breakouts.map((b) => (
                  <button key={b} onClick={() => joinBreakout(b)} className={`rounded-xl border px-4 py-2 text-sm font-medium ${myBreakout === b ? 'border-brand bg-brand-soft text-brand' : 'border-gray-200 hover:border-brand'}`}>Room {b}</button>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-soft">Chat is scoped to your breakout room while open.</p>
            </Card>
          )}
          {poll && (
            <Card>
              <p className="font-semibold text-ink">{poll.question}</p>
              <div className="mt-2 space-y-2">
                {poll.options.map((o, i) => { const total = poll.votes.reduce((a, b) => a + b, 0) || 1; return (
                  <button key={i} onClick={() => vote(i)} className="w-full text-left">
                    <div className="flex justify-between text-sm"><span>{o}</span><span className="text-ink-soft">{poll.votes[i]}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand" style={{ width: `${(poll.votes[i] / total) * 100}%` }} /></div>
                  </button>); })}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          {camAttention && !isTeacher && <CameraAttention socket={socketRef.current} sessionId={id} />}
          <Card>
            <div className="flex items-center justify-between">
              <button onClick={raiseHand} className="inline-flex items-center gap-1 rounded-lg bg-gold-soft px-3 py-1.5 text-sm font-medium text-gold-dark"><Hand className="h-4 w-4" /> Raise hand</button>
              {hands.length > 0 && <span className="text-xs text-ink-soft">{hands.length} ✋</span>}
            </div>
            <div className="mt-3 flex justify-between">{EMOJIS.map((e) => <button key={e} onClick={() => react(e)} className="text-xl hover:scale-125">{e}</button>)}</div>
          </Card>

          <Card className="flex h-[360px] flex-col">
            <p className="mb-2 text-sm font-semibold text-ink">Class chat</p>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {chat.map(renderMsg)}
              {chat.length === 0 && <p className="text-sm text-ink-soft">No messages yet. Say hello 👋 (use @name to mention)</p>}
              <div ref={chatEndRef} />
            </div>
            <div className="mt-2 flex items-center gap-1">
              <button onClick={() => fileRef.current?.click()} className="rounded-lg p-2 text-ink-soft hover:text-brand"><Paperclip className="h-4 w-4" /></button>
              <input ref={fileRef} type="file" hidden onChange={onFile} />
              <button onClick={toggleVoice} className={`rounded-lg p-2 ${recording ? 'bg-coral text-white' : 'text-ink-soft hover:text-brand'}`}>{recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
              <input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder="Message…" className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand" />
              <button onClick={send} className="rounded-lg bg-brand px-2.5 py-1.5 text-white"><Send className="h-4 w-4" /></button>
            </div>
          </Card>
        </div>
      </div>

      {notes && (
        <Card className="relative">
          <button onClick={() => setNotes(null)} className="absolute right-4 top-4 text-gray-400"><X className="h-4 w-4" /></button>
          <h2 className="inline-flex items-center gap-2 font-semibold text-ink"><FileText className="h-5 w-5 text-brand" /> Class notes</h2>
          <p className="mt-2 text-sm text-ink">{notes.summary}</p>
          {notes.keyPoints?.length > 0 && <><p className="mt-3 text-sm font-semibold">Key points</p><ul className="ml-5 list-disc text-sm text-ink-soft">{notes.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul></>}
          {notes.formulas?.length > 0 && <><p className="mt-3 text-sm font-semibold">Formulas</p><ul className="ml-5 list-disc font-mono text-sm text-ink-soft">{notes.formulas.map((k, i) => <li key={i}>{k}</li>)}</ul></>}
          {notes.homework?.length > 0 && <><p className="mt-3 text-sm font-semibold">Homework</p><ul className="ml-5 list-disc text-sm text-ink-soft">{notes.homework.map((k, i) => <li key={i}>{k}</li>)}</ul></>}
          {notes.unansweredQuestions?.length > 0 && <><p className="mt-3 text-sm font-semibold">Unanswered questions</p><ul className="ml-5 list-disc text-sm text-ink-soft">{notes.unansweredQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul></>}
        </Card>
      )}
    </div>
  );
}
