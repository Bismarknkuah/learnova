'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, UserPlus, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Invite { _id: string; email: string; role: string; status: string; token: string; expiresAt: string }

export function InvitePanel() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('teacher');
  const [copied, setCopied] = useState('');

  const { data: invites } = useQuery({ queryKey: ['invites'], queryFn: () => api.get<Invite[]>('/invites', token), enabled: !!token });
  const create = useMutation({
    mutationFn: () => api.post('/invites', { email, role }, token),
    onSuccess: () => { setEmail(''); qc.invalidateQueries({ queryKey: ['invites'] }); },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.post(`/invites/${id}/revoke`, {}, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }),
  });

  const linkFor = (t: string) => `${typeof window !== 'undefined' ? window.location.origin : ''}/accept-invite?token=${t}`;
  const copy = (t: string) => { navigator.clipboard.writeText(linkFor(t)); setCopied(t); setTimeout(() => setCopied(''), 1500); };

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Invite people to your school</h2>
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-sm text-ink-soft">Email</label>
            <Input placeholder="person@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink-soft">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-2.5">
              {['teacher', 'student', 'parent', 'school_admin'].map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <Button onClick={() => create.mutate()} disabled={!email || create.isPending}>
            <UserPlus className="mr-1 h-4 w-4" /> {create.isPending ? 'Inviting…' : 'Send invite'}
          </Button>
        </div>
        {create.error && <p className="mt-2 text-sm text-coral">{(create.error as Error).message}</p>}

        <div className="mt-5 divide-y">
          {invites?.map((inv) => (
            <div key={inv._id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <span className="font-medium">{inv.email}</span>
                <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs capitalize text-ink-soft">{inv.role.replace('_', ' ')}</span>
                <span className={`ml-2 text-xs ${inv.status === 'accepted' ? 'text-brand' : inv.status === 'revoked' ? 'text-gray-400' : 'text-gold-dark'}`}>{inv.status}</span>
              </div>
              {inv.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button onClick={() => copy(inv.token)} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:border-brand">
                    {copied === inv.token ? <><Check className="h-3 w-3 text-brand" /> Copied</> : <><Copy className="h-3 w-3" /> Copy link</>}
                  </button>
                  <button onClick={() => revoke.mutate(inv._id)} className="rounded-lg p-1 text-gray-400 hover:text-coral"><X className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          ))}
          {!invites?.length && <p className="py-2 text-ink-soft">No invites yet. Invite your teachers and students to get started.</p>}
        </div>
      </Card>
    </section>
  );
}
