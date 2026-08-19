'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, PenLine, CheckCircle2, ClipboardList, GraduationCap, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/profile/useMe';

interface Task { _id: string; title: string; instructions: string; subject?: string; level?: string; dueDate?: string; maxScore?: number; tutorName?: string }
interface Sub { _id: string; studentName?: string; text: string; status: string; grade?: { value: number; feedback?: string } }
interface StudentRow { task: Task; submission: Sub | null }
interface TeacherRow { task: Task; submissions: number; graded: number }

export default function AssignmentsPage() {
  const { data: me } = useMe();
  const isStaff = me?.role === 'teacher' || me?.role === 'school_admin' || me?.role === 'super_admin';
  return <div className="space-y-5">{isStaff ? <TeacherView /> : <StudentView />}</div>;
}

// ---------- Student ----------
function StudentView() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['assignment-tasks'], queryFn: () => api.get<StudentRow[]>('/assignments/tasks', token), enabled: !!token });
  return (
    <>
      <div><h1 className="text-2xl font-bold text-ink">My assignments</h1><p className="text-sm text-ink-soft">Write and submit your work. Grades and feedback appear here once marked.</p></div>
      <div className="space-y-4">
        {data?.map((r) => <StudentTask key={r.task._id} row={r} token={token} onDone={() => qc.invalidateQueries({ queryKey: ['assignment-tasks'] })} />)}
        {!data?.length && <p className="text-ink-soft">No assignments set yet.</p>}
      </div>
    </>
  );
}

function StudentTask({ row, token, onDone }: { row: StudentRow; token?: string; onDone: () => void }) {
  const [text, setText] = useState(row.submission?.text ?? '');
  const [busy, setBusy] = useState(false);
  const graded = row.submission?.status === 'graded';
  const submit = async () => { setBusy(true); try { await api.post(`/assignments/tasks/${row.task._id}/submit`, { text }, token); onDone(); } finally { setBusy(false); } };
  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-ink">{row.task.title}</h3>
          <p className="text-xs text-ink-soft">{row.task.subject} · by {row.task.tutorName ?? 'Teacher'}{row.task.dueDate ? ` · due ${new Date(row.task.dueDate).toLocaleDateString()}` : ''}</p>
        </div>
        {row.submission && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${graded ? 'bg-brand-soft text-brand' : 'bg-gold-soft text-gold-dark'}`}>{graded ? 'Graded' : 'Submitted'}</span>}
      </div>
      <p className="text-sm text-ink-soft">{row.task.instructions}</p>
      {graded ? (
        <div className="rounded-xl bg-brand-soft/50 p-3">
          <p className="font-semibold text-brand">Score: {row.submission!.grade?.value}/{row.task.maxScore ?? 100}</p>
          {row.submission!.grade?.feedback && <p className="mt-1 text-sm text-ink-soft">“{row.submission!.grade.feedback}”</p>}
        </div>
      ) : (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Write your answer here…" className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-brand" />
          <button onClick={submit} disabled={busy || text.trim().length < 1} className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><PenLine className="h-4 w-4" /> {row.submission ? 'Update submission' : 'Submit'}</button>
        </>
      )}
    </Card>
  );
}

// ---------- Teacher ----------
function TeacherView() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['teacher-tasks'], queryFn: () => api.get<TeacherRow[]>('/assignments/tasks', token), enabled: !!token });
  const [creating, setCreating] = useState(false);
  const [grading, setGrading] = useState<string | null>(null);

  return (
    <>
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-ink">Assignments</h1><p className="text-sm text-ink-soft">Set written work and grade your students’ submissions.</p></div>
        <button onClick={() => setCreating((v) => !v)} className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> New assignment</button>
      </div>
      {creating && <CreateForm token={token} onDone={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['teacher-tasks'] }); }} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((r) => (
          <Card key={r.task._id}>
            <h3 className="font-bold text-ink">{r.task.title}</h3>
            <p className="text-xs text-ink-soft">{r.task.subject} · {r.task.level}</p>
            <p className="mt-1 text-sm text-ink-soft">{r.submissions} submitted · {r.graded} graded</p>
            <button onClick={() => setGrading(r.task._id)} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white"><ClipboardList className="h-4 w-4" /> Review & grade</button>
          </Card>
        ))}
        {!data?.length && <p className="text-ink-soft">No assignments yet — create your first.</p>}
      </div>
      {grading && <GradePanel taskId={grading} token={token} onClose={() => { setGrading(null); qc.invalidateQueries({ queryKey: ['teacher-tasks'] }); }} />}
    </>
  );
}

function CreateForm({ token, onDone }: { token?: string; onDone: () => void }) {
  const [f, setF] = useState({ title: '', instructions: '', subject: '', level: 'Any', dueDate: '', maxScore: 100 });
  const submit = async () => {
    await api.post('/assignments/tasks', { title: f.title, instructions: f.instructions, subject: f.subject || undefined, level: f.level, dueDate: f.dueDate || undefined, maxScore: f.maxScore }, token);
    onDone();
  };
  return (
    <Card className="space-y-2">
      <h3 className="font-semibold text-ink">New written assignment</h3>
      <input placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      <textarea placeholder="Instructions / question for students" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      <div className="grid gap-2 sm:grid-cols-3">
        <input placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <label className="flex items-center gap-1 text-sm text-ink-soft">Max <input type="number" value={f.maxScore} onChange={(e) => setF({ ...f, maxScore: Number(e.target.value) })} className="w-16 rounded-lg border border-gray-300 px-2 py-1" /></label>
      </div>
      <button onClick={submit} disabled={f.title.length < 2 || f.instructions.length < 5} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Assign to students</button>
    </Card>
  );
}

function GradePanel({ taskId, token, onClose }: { taskId: string; token?: string; onClose: () => void }) {
  const { data, refetch } = useQuery({ queryKey: ['task-subs', taskId], queryFn: () => api.get<{ task: Task; submissions: Sub[] }>(`/assignments/tasks/${taskId}/submissions`, token), enabled: !!token });
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-ink">{data?.task.title} — submissions</h3>
        <div className="mt-3 space-y-3">
          {data?.submissions.map((s) => <GradeRow key={s._id} sub={s} maxScore={data.task.maxScore ?? 100} token={token} onGraded={refetch} />)}
          {!data?.submissions.length && <p className="text-ink-soft">No submissions yet.</p>}
        </div>
        <button onClick={onClose} className="mt-4 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold">Close</button>
      </div>
    </div>
  );
}

function GradeRow({ sub, maxScore, token, onGraded }: { sub: Sub; maxScore: number; token?: string; onGraded: () => void }) {
  const [value, setValue] = useState(sub.grade?.value ?? 0);
  const [feedback, setFeedback] = useState(sub.grade?.feedback ?? '');
  const [aiBusy, setAiBusy] = useState(false);
  const grade = async () => { await api.post(`/assignments/submissions/${sub._id}/grade`, { value, feedback }, token); onGraded(); };
  const aiSuggest = async () => {
    setAiBusy(true);
    try {
      const r = await api.post<{ score: number; feedback: string }>(`/assignments/submissions/${sub._id}/ai-grade`, {}, token);
      setValue(r.score); setFeedback(r.feedback);
    } catch (e) { alert((e as Error).message); } finally { setAiBusy(false); }
  };
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink">{sub.studentName ?? 'Student'}</p>
        {sub.status === 'graded' && <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand"><CheckCircle2 className="h-3.5 w-3.5" /> {sub.grade?.value}/{maxScore}</span>}
      </div>
      <p className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 p-2 text-sm text-ink">{sub.text}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button onClick={aiSuggest} disabled={aiBusy} className="inline-flex items-center gap-1 rounded-lg border border-violet-300 px-3 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"><Sparkles className="h-4 w-4" /> {aiBusy ? 'Thinking…' : 'AI suggest'}</button>
        <label className="flex items-center gap-1 text-sm text-ink-soft"><GraduationCap className="h-4 w-4" /> Score <input type="number" value={value} max={maxScore} onChange={(e) => setValue(Number(e.target.value))} className="w-16 rounded-lg border border-gray-300 px-2 py-1" /> / {maxScore}</label>
        <button onClick={grade} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white">Save grade</button>
      </div>
      <textarea placeholder="Feedback (AI can draft this — you can edit before saving)" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
    </div>
  );
}
