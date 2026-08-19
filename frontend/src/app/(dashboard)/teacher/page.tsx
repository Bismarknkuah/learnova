'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

export default function TeacherDashboard() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: balance, isLoading } = useQuery({
    queryKey: ['balance'],
    queryFn: () => api.get<{ account: string; balanceGHS: number }>('/payments/balance', token),
    enabled: !!token,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Teacher dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-gray-500">Available earnings</p>
          <p className="mt-1 text-3xl font-bold text-brand">{isLoading ? '…' : `₵${balance?.balanceGHS ?? 0}`}</p>
        </Card>
        <Card><Link href="/twin"><p className="font-medium">Train my AI Twin →</p><p className="text-sm text-gray-500">Upload lessons</p></Link></Card>
        <Card><Link href="/marketplace"><p className="font-medium">Sell content →</p><p className="text-sm text-gray-500">Courses, notes, past questions</p></Link></Card>
      </div>
      <VerifyCard token={token} />
      <Card>
        <h2 className="mb-2 font-semibold">Quick actions</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/classroom/new" className="rounded-lg bg-brand px-3 py-2 text-white">Start a class</Link>
          <Link href="/tutors" className="rounded-lg border px-3 py-2">My profile</Link>
          <Link href="/bookings" className="rounded-lg border px-3 py-2">Upcoming sessions</Link>
          <Link href="/earnings" className="rounded-lg border px-3 py-2">Earnings & payouts</Link>
        </div>
      </Card>
    </div>
  );
}

function VerifyCard({ token }: { token?: string }) {
  const [docType, setDocType] = useState('ghana_card');
  const [docNumber, setDocNumber] = useState('');
  const [sent, setSent] = useState(false);
  const submit = async () => {
    try { await api.post('/tutors/verify-request', { docType, docNumber }, token); setSent(true); }
    catch (e) { alert((e as Error).message); }
  };
  return (
    <Card>
      <h2 className="inline-flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-brand" /> Get the Verified Tutor badge</h2>
      <p className="mt-1 text-sm text-gray-500">Submit a Ghana Card, passport or professional license for review.</p>
      {sent ? <p className="mt-2 text-sm text-brand">✓ Submitted for review. You’ll get the badge once approved.</p> : (
        <div className="mt-2 flex flex-wrap gap-2">
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="ghana_card">Ghana Card</option><option value="passport">Passport</option><option value="license">Professional license</option>
          </select>
          <input placeholder="Document number" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <button onClick={submit} disabled={docNumber.length < 4} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Submit</button>
        </div>
      )}
    </Card>
  );
}
