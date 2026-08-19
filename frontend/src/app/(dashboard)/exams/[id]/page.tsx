'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useProctoring } from '@/features/proctoring/useProctoring';

interface StartResult { attemptId: string; durationMin: number; questions: { prompt: string; options: string[] }[] }

export default function TakeExamPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const [exam, setExam] = useState<StartResult | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ score: number; flagged: boolean } | null>(null);
  const { events, riskScore, videoRef, enterFullscreen, aiReady } = useProctoring(!!exam && !result);

  const start = async () => {
    const r = await api.post<StartResult>(`/exams/${id}/start`, {}, token);
    setExam(r); setAnswers(new Array(r.questions.length).fill(-1));
    enterFullscreen();
  };

  const submit = async () => {
    const r = await api.post<{ score: number; flagged: boolean }>('/exams/submit', {
      attemptId: exam!.attemptId, answers, proctorEvents: events,
    }, token);
    setResult(r);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  useEffect(() => () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }, []);

  if (result) return (
    <Card>
      <h1 className="text-2xl font-bold">Result</h1>
      <p className="mt-2 text-4xl font-bold text-brand">{result.score}%</p>
      {result.flagged && <p className="mt-2 text-sm text-red-600">⚠ This attempt was flagged for review (proctoring signals).</p>}
      <Button onClick={() => router.push('/exams')} className="mt-4">Back to exams</Button>
    </Card>
  );

  if (!exam) return (
    <Card>
      <h1 className="text-2xl font-bold">Proctored exam</h1>
      <p className="mt-2 text-sm text-gray-600">This exam is monitored on your device. Your camera turns on locally, and tab-switching, leaving fullscreen, and copy/paste are recorded. No video leaves your device.</p>
      <Button onClick={start} className="mt-4">Start exam</Button>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Exam in progress</h1>
        <div className="flex items-center gap-3">
          <video ref={videoRef} autoPlay muted className="h-16 w-24 rounded bg-black object-cover" />
          <div className="text-right text-sm"><span className={riskScore >= 6 ? 'text-red-600' : 'text-gray-400'}>integrity: {riskScore === 0 ? 'clean' : riskScore}</span><br/><span className="text-xs text-gray-400">{aiReady ? 'AI vision: on' : 'AI vision: loading…'}</span></div>
        </div>
      </div>
      {exam.questions.map((q, qi) => (
        <Card key={qi}>
          <p className="font-medium">{qi + 1}. {q.prompt}</p>
          <div className="mt-2 space-y-1">
            {q.options.map((opt, oi) => (
              <label key={oi} className="flex items-center gap-2 text-sm">
                <input type="radio" name={`q${qi}`} checked={answers[qi] === oi}
                  onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))} />
                {opt}
              </label>
            ))}
          </div>
        </Card>
      ))}
      <Button onClick={submit}>Submit exam</Button>
    </div>
  );
}
