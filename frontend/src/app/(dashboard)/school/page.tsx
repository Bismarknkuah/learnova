'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Users, BookOpen, CalendarDays, Wallet, GraduationCap, Megaphone, MapPin, AlertTriangle, BarChart3, Bell, UserPlus, Palette, Upload } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

type Tab = 'overview' | 'roster' | 'users' | 'branding' | 'academics' | 'timetable' | 'fees' | 'results' | 'risk' | 'analytics' | 'campuses' | 'announce';
const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'roster', label: 'People', icon: Users },
  { id: 'academics', label: 'Academics', icon: BookOpen },
  { id: 'timetable', label: 'Timetable', icon: CalendarDays },
  { id: 'fees', label: 'Fees', icon: Wallet },
  { id: 'results', label: 'Results', icon: GraduationCap },
  { id: 'users', label: 'Add users', icon: UserPlus },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'risk', label: 'At-risk', icon: AlertTriangle },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'campuses', label: 'Campuses', icon: MapPin },
  { id: 'announce', label: 'Announce', icon: Megaphone },
];

function useToken() { return useAuth((s) => s.accessToken) ?? undefined; }

function List<T>({ qk, url, render, empty }: { qk: string; url: string; render: (x: T) => React.ReactNode; empty: string }) {
  const token = useToken();
  const { data } = useQuery({ queryKey: [qk], queryFn: () => api.get<T[]>(url, token), enabled: !!token });
  if (!data?.length) return <p className="text-sm text-ink-soft">{empty}</p>;
  return <div className="space-y-2">{data.map((x, i) => <div key={i}>{render(x)}</div>)}</div>;
}

function CreateForm({ fields, url, qk, label }: { fields: { name: string; placeholder: string; type?: string }[]; url: string; qk: string; label: string }) {
  const token = useToken(); const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {};
      for (const f of fields) { const v = form[f.name]; if (v == null || v === '') continue; body[f.name] = f.type === 'number' ? Number(v) : v; }
      await api.post(url, body, token); setForm({}); qc.invalidateQueries({ queryKey: [qk] });
    } finally { setBusy(false); }
  };
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {fields.map((f) => (
        <input key={f.name} type={f.type ?? 'text'} placeholder={f.placeholder} value={form[f.name] ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, [f.name]: e.target.value }))}
          className="min-w-[120px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand" />
      ))}
      <button onClick={submit} disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">{label}</button>
    </div>
  );
}

export default function SchoolPortal() {
  const token = useToken();
  const [tab, setTab] = useState<Tab>('overview');
  const { data: stats } = useQuery({ queryKey: ['school-stats'], queryFn: () => api.get<Record<string, number>>('/schools/stats', token), enabled: !!token });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">School portal</h1>
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium ${tab === t.id ? 'bg-brand text-white' : 'border border-gray-200 hover:border-brand'}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[['Students', 'students'], ['Teachers', 'teachers'], ['Campuses', 'campuses'], ['Courses', 'courses'], ['Results', 'results']].map(([label, key]) => (
            <Card key={key}><p className="text-sm text-ink-soft">{label}</p><p className="mt-1 text-3xl font-bold text-ink">{stats?.[key] ?? 0}</p></Card>
          ))}
        </div>
      )}

      {tab === 'roster' && (
        <Card>
          <List<{ name: string; email?: string; role: string; status: string }> qk="roster" url="/schools/roster" empty="No members yet."
            render={(m) => <div className="flex items-center justify-between border-b border-gray-100 py-2 text-sm last:border-0"><span className="font-medium">{m.name}</span><span className="text-ink-soft">{m.role} · {m.status}</span></div>} />
        </Card>
      )}

      {tab === 'academics' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><h3 className="mb-2 font-semibold">Departments</h3>
            <CreateForm qk="departments" url="/schools/departments" label="Add" fields={[{ name: 'name', placeholder: 'Department name' }, { name: 'head', placeholder: 'Head (optional)' }]} />
            <List<{ name: string; head?: string }> qk="departments" url="/schools/departments" empty="No departments yet." render={(d) => <p className="border-b border-gray-100 py-1.5 text-sm last:border-0">{d.name}{d.head ? ` · ${d.head}` : ''}</p>} />
          </Card>
          <Card><h3 className="mb-2 font-semibold">Courses</h3>
            <CreateForm qk="courses" url="/schools/courses" label="Add" fields={[{ name: 'code', placeholder: 'Code' }, { name: 'title', placeholder: 'Course title' }, { name: 'credits', placeholder: 'Credits', type: 'number' }]} />
            <List<{ code: string; title: string; credits: number }> qk="courses" url="/schools/courses" empty="No courses yet." render={(c) => <p className="border-b border-gray-100 py-1.5 text-sm last:border-0"><b>{c.code}</b> · {c.title} <span className="text-ink-soft">({c.credits} cr)</span></p>} />
          </Card>
        </div>
      )}

      {tab === 'timetable' && (
        <Card><h3 className="mb-2 font-semibold">Timetable</h3>
          <CreateForm qk="timetable" url="/schools/timetable" label="Add" fields={[{ name: 'courseTitle', placeholder: 'Course' }, { name: 'day', placeholder: 'Day' }, { name: 'startTime', placeholder: 'Start (09:00)' }, { name: 'endTime', placeholder: 'End (10:30)' }, { name: 'room', placeholder: 'Room' }]} />
          <List<{ courseTitle: string; day: string; startTime: string; endTime: string; room?: string }> qk="timetable" url="/schools/timetable" empty="No entries yet."
            render={(t) => <div className="flex justify-between border-b border-gray-100 py-1.5 text-sm last:border-0"><span>{t.day} · {t.courseTitle}</span><span className="text-ink-soft">{t.startTime}–{t.endTime} {t.room ? `· ${t.room}` : ''}</span></div>} />
        </Card>
      )}

      {tab === 'fees' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><h3 className="mb-2 font-semibold">Fee structures</h3>
            <CreateForm qk="fees" url="/schools/fees" label="Add" fields={[{ name: 'name', placeholder: 'e.g. Term 1 tuition' }, { name: 'amountGHS', placeholder: 'Amount ₵', type: 'number' }, { name: 'term', placeholder: 'Term' }]} />
            <List<{ name: string; amountGHS: number; term?: string }> qk="fees" url="/schools/fees" empty="No fee structures yet." render={(f) => <div className="flex justify-between border-b border-gray-100 py-1.5 text-sm last:border-0"><span>{f.name}{f.term ? ` · ${f.term}` : ''}</span><span className="font-semibold text-brand">₵{f.amountGHS}</span></div>} />
          </Card>
          <Card><h3 className="mb-2 font-semibold">Invoices</h3>
            <CreateForm qk="invoices" url="/schools/invoices" label="Invoice" fields={[{ name: 'studentId', placeholder: 'Student ID' }, { name: 'name', placeholder: 'Description' }, { name: 'amountGHS', placeholder: 'Amount ₵', type: 'number' }]} />
            <List<{ name?: string; amountGHS: number; status: string; studentId?: { name?: string } }> qk="invoices" url="/schools/invoices" empty="No invoices yet."
              render={(i) => <div className="flex justify-between border-b border-gray-100 py-1.5 text-sm last:border-0"><span>{i.studentId?.name ?? 'Student'} · {i.name}</span><span className={i.status === 'paid' ? 'text-brand' : 'text-coral'}>₵{i.amountGHS} · {i.status}</span></div>} />
          </Card>
        </div>
      )}

      {tab === 'results' && (
        <Card><h3 className="mb-2 font-semibold">Results</h3>
          <CreateForm qk="results" url="/schools/results" label="Record" fields={[{ name: 'studentId', placeholder: 'Student ID' }, { name: 'courseTitle', placeholder: 'Course' }, { name: 'score', placeholder: 'Score (0–100)', type: 'number' }, { name: 'term', placeholder: 'Term' }]} />
          <List<{ courseTitle: string; score: number; grade: string; studentId?: { name?: string } }> qk="results" url="/schools/results" empty="No results yet."
            render={(r) => <div className="flex justify-between border-b border-gray-100 py-1.5 text-sm last:border-0"><span>{r.studentId?.name ?? 'Student'} · {r.courseTitle}</span><span className="font-semibold">{r.score} · {r.grade}</span></div>} />
        </Card>
      )}

      {tab === 'users' && <UsersTab />}
      {tab === 'branding' && <BrandingTab />}
      {tab === 'risk' && <RiskTab />}
      {tab === 'analytics' && <AnalyticsTab />}

      {tab === 'campuses' && (
        <Card><h3 className="mb-2 font-semibold">Campuses & branches</h3>
          <p className="mb-2 text-sm text-ink-soft">One owner, many campuses — add each branch here.</p>
          <CreateForm qk="school-stats" url="/schools/campuses" label="Add campus" fields={[{ name: 'name', placeholder: 'Campus name' }, { name: 'region', placeholder: 'Region' }, { name: 'address', placeholder: 'Address' }]} />
        </Card>
      )}

      {tab === 'announce' && (
        <Card><h3 className="mb-2 font-semibold">Send announcement</h3>
          <p className="mb-2 text-sm text-ink-soft">Delivered in-app to everyone in your school. SMS/email need a provider (Twilio/SendGrid).</p>
          <CreateForm qk="noop" url="/schools/announce" label="Send" fields={[{ name: 'title', placeholder: 'Title' }, { name: 'body', placeholder: 'Message' }]} />
        </Card>
      )}
    </div>
  );
}

interface Risk { studentId: string; name: string; risk: number; reasons: string[]; interventions: string[] }
function RiskTab() {
  const token = useToken();
  const { data } = useQuery({ queryKey: ['risk'], queryFn: () => api.get<Risk[]>('/schools/risk-report', token), enabled: !!token });
  const notify = async (r: Risk) => {
    try { const res = await api.post<{ sent: number }>('/schools/risk-report/notify', { studentId: r.studentId, risk: r.risk, interventions: r.interventions }, token);
      alert(`Notified ${res.sent} people (student, parent, teachers).`); } catch (e) { alert((e as Error).message); }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">AI predicts students likely to struggle, from mastery, results and attendance.</p>
      {data?.map((r) => (
        <Card key={r.studentId}>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-ink">{r.name}</p>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${r.risk >= 70 ? 'bg-coral-soft text-coral' : r.risk >= 40 ? 'bg-gold-soft text-gold-dark' : 'bg-brand-soft text-brand'}`}>Risk {r.risk}%</span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">{r.reasons.join(' · ')}</p>
          <ul className="mt-2 ml-5 list-disc text-sm text-ink">{r.interventions.map((i, k) => <li key={k}>{i}</li>)}</ul>
          <button onClick={() => notify(r)} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white"><Bell className="h-3.5 w-3.5" /> Notify student, parent & teacher</button>
        </Card>
      ))}
      {!data?.length && <p className="text-ink-soft">No at-risk students detected — great! (Needs mastery/results/attendance data.)</p>}
    </div>
  );
}

interface Analytics { students: number; avgScore: number; revenueGHS: number; commissionGHS: number; attendanceTotal: number; sessions: number; performance: { course: string; avg: number }[]; teacherEffectiveness: { name: string; rating: number; sessions: number }[] }
function AnalyticsTab() {
  const token = useToken();
  const { data } = useQuery({ queryKey: ['analytics'], queryFn: () => api.get<Analytics>('/schools/analytics', token), enabled: !!token });
  if (!data) return <p className="text-ink-soft">Loading analytics…</p>;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        {[['Avg score', `${data.avgScore}%`], ['Revenue', `₵${data.revenueGHS.toLocaleString()}`], ['Platform comm.', `₵${data.commissionGHS.toLocaleString()}`], ['Attendance', String(data.attendanceTotal)]].map(([l, v]) => (
          <Card key={l}><p className="text-sm text-ink-soft">{l}</p><p className="mt-1 text-2xl font-bold text-ink">{v}</p></Card>
        ))}
      </div>
      <Card>
        <p className="mb-2 font-semibold text-ink">Performance by course</p>
        {data.performance.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.performance}><XAxis dataKey="course" fontSize={11} /><YAxis domain={[0, 100]} fontSize={11} /><Tooltip /><Bar dataKey="avg" fill="#0E7C5A" radius={[6, 6, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-ink-soft">No results recorded yet.</p>}
      </Card>
      <Card>
        <p className="mb-2 font-semibold text-ink">Teacher effectiveness</p>
        <div className="space-y-1.5">
          {data.teacherEffectiveness.map((t, i) => (
            <div key={i} className="flex justify-between border-b border-gray-100 py-1.5 text-sm last:border-0"><span>{t.name}</span><span className="text-ink-soft">★ {t.rating.toFixed(1)} · {t.sessions} sessions</span></div>
          ))}
          {!data.teacherEffectiveness.length && <p className="text-sm text-ink-soft">No teacher data yet.</p>}
        </div>
      </Card>
    </div>
  );
}

interface RosterUser { _id: string; name: string; email?: string; role: string }
function UsersTab() {
  const token = useToken(); const qc = useQueryClient();
  const { data: roster } = useQuery({ queryKey: ['roster'], queryFn: () => api.get<RosterUser[]>('/schools/roster', token), enabled: !!token });
  const [form, setForm] = useState({ name: '', email: '', role: 'student', password: '' });
  const [bulk, setBulk] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [bulkRole, setBulkRole] = useState('student');
  const [msg, setMsg] = useState('');

  const addOne = async () => {
    try { const r = await api.post<{ tempPassword?: string }>('/schools/users', form, token);
      setMsg(`✓ Added ${form.name}${r.tempPassword ? ` (temp password: ${r.tempPassword})` : ''}`); setForm({ name: '', email: '', role: 'student', password: '' }); qc.invalidateQueries({ queryKey: ['roster'] }); }
    catch (e) { setMsg((e as Error).message); }
  };
  const addBulk = async () => {
    const rows = bulk.split('\n').map((l) => l.split(',').map((x) => x.trim())).filter((c) => c[0]).map((c) => ({ name: c[0], email: c[1], role: c[2] || 'student' }));
    if (!rows.length) return;
    const r = await api.post<{ created: number; skipped: string[] }>('/schools/users/bulk', { rows }, token);
    setMsg(`✓ Created ${r.created}, skipped ${r.skipped.length}. Default password: learnova123`); setBulk(''); qc.invalidateQueries({ queryKey: ['roster'] });
  };
  const applyRole = async () => {
    if (!sel.length) return;
    const r = await api.patch<{ updated: number }>('/schools/users/roles', { userIds: sel, role: bulkRole }, token);
    setMsg(`✓ Updated ${r.updated} users to ${bulkRole}`); setSel([]); qc.invalidateQueries({ queryKey: ['roster'] });
  };

  return (
    <div className="space-y-4">
      {msg && <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{msg}</p>}
      <Card>
        <p className="mb-2 inline-flex items-center gap-2 font-semibold"><UserPlus className="h-5 w-5 text-brand" /> Add a student or staff member</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="student">Student</option><option value="teacher">Teacher</option><option value="parent">Parent</option><option value="school_admin">School admin</option></select>
          <input placeholder="Temp password (optional)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button onClick={addOne} disabled={!form.name || !form.email} className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Add user</button>
      </Card>

      <Card>
        <p className="mb-1 font-semibold">Bulk import</p>
        <p className="mb-2 text-xs text-ink-soft">One per line: <code>name, email, role</code> (role optional, defaults to student).</p>
        <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={4} placeholder={"Ama Mensah, ama2@school.edu, student\nKofi Owusu, kofi@school.edu, teacher"} className="w-full rounded-lg border border-gray-300 p-3 font-mono text-xs" />
        <button onClick={addBulk} disabled={!bulk.trim()} className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Import users</button>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-semibold">Bulk set role ({sel.length} selected)</p>
          <div className="flex gap-2">
            <select value={bulkRole} onChange={(e) => setBulkRole(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 text-sm"><option value="student">Student</option><option value="teacher">Teacher</option><option value="parent">Parent</option><option value="school_admin">School admin</option></select>
            <button onClick={applyRole} disabled={!sel.length} className="rounded-lg bg-ink px-3 py-1 text-sm font-medium text-white">Apply</button>
          </div>
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {roster?.map((u) => (
            <label key={u._id} className="flex items-center gap-2 border-b border-gray-50 py-1.5 text-sm">
              <input type="checkbox" checked={sel.includes(u._id)} onChange={(e) => setSel(e.target.checked ? [...sel, u._id] : sel.filter((x) => x !== u._id))} />
              <span className="flex-1">{u.name} <span className="text-ink-soft">· {u.email}</span></span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-ink-soft">{u.role.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}

function BrandingTab() {
  const token = useToken(); const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['branding'], queryFn: () => api.get<Record<string, string>>('/branding', token), enabled: !!token });
  const [b, setB] = useState<Record<string, string>>({});
  const v = (k: string) => b[k] ?? data?.[k] ?? '';
  const onFile = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 600_000) { alert('Please use an image under 600KB (or paste a URL).'); return; }
    const r = new FileReader(); r.onload = () => setB({ ...b, [k]: String(r.result) }); r.readAsDataURL(f);
  };
  const save = async () => { await api.patch('/branding', b, token); qc.invalidateQueries({ queryKey: ['branding'] }); qc.invalidateQueries({ queryKey: ['branding-banner'] }); alert('✓ Branding saved — your dashboard banner is updated.'); };

  return (
    <div className="space-y-4">
      {/* Live preview */}
      <div className="overflow-hidden rounded-2xl border border-gray-200">
        <div className="relative h-36 bg-gradient-to-r from-brand to-brand-dark" style={v('bannerUrl') ? { backgroundImage: `url(${v('bannerUrl')})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
          <div className="absolute bottom-3 left-4 flex items-center gap-3">
            {v('logoUrl') ? <img src={v('logoUrl')} alt="logo" className="h-14 w-14 rounded-xl border-2 border-white object-cover" /> : <span className="grid h-14 w-14 place-items-center rounded-xl border-2 border-white bg-white font-black text-brand">{(v('name') || 'S')[0]}</span>}
            <div className="text-white drop-shadow"><p className="text-lg font-bold">{v('name') || 'Your School'}</p><p className="text-sm opacity-90">{v('tagline') || 'Your tagline here'}</p></div>
          </div>
        </div>
      </div>

      <Card className="space-y-3">
        <p className="inline-flex items-center gap-2 font-semibold"><Palette className="h-5 w-5 text-brand" /> School identity</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">School name<input value={v('name')} onChange={(e) => setB({ ...b, name: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm">Tagline<input value={v('tagline')} onChange={(e) => setB({ ...b, tagline: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm">Brand colour<input type="color" value={v('primaryColor') || '#0E7C5A'} onChange={(e) => setB({ ...b, primaryColor: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-gray-300" /></label>
        </div>
        <label className="block text-sm">About<textarea value={v('about')} onChange={(e) => setB({ ...b, about: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div><p className="mb-1 text-sm font-medium">Logo / symbol</p>
            <input placeholder="Paste image URL…" value={v('logoUrl').startsWith('data:') ? '' : v('logoUrl')} onChange={(e) => setB({ ...b, logoUrl: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs text-brand"><Upload className="h-3.5 w-3.5" /> or upload<input type="file" accept="image/*" onChange={onFile('logoUrl')} className="hidden" /></label>
          </div>
          <div><p className="mb-1 text-sm font-medium">Banner</p>
            <input placeholder="Paste banner URL…" value={v('bannerUrl').startsWith('data:') ? '' : v('bannerUrl')} onChange={(e) => setB({ ...b, bannerUrl: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs text-brand"><Upload className="h-3.5 w-3.5" /> or upload<input type="file" accept="image/*" onChange={onFile('bannerUrl')} className="hidden" /></label>
          </div>
        </div>
        <button onClick={save} className="rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white">Save branding</button>
        <p className="text-xs text-ink-soft">Uploads are stored inline (keep under 600KB). For large images, host them and paste the URL.</p>
      </Card>
    </div>
  );
}
