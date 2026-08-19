'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/profile/useMe';
import { InvitePanel } from '@/features/invites/InvitePanel';

interface Overview { scope: string; students: number; teachers: number; admins: number; bookings: number; products: number; tenants: number }
interface AgentStatus { online: boolean; agents: { name: string; capabilities: string[] }[]; capabilities: string[] }
interface AdminUser { _id: string; name: string; email?: string; role: string; status: string }

export default function AdminPage() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: me } = useMe();
  const qc = useQueryClient();
  const isSuper = me?.role === 'super_admin';

  const { data: ov } = useQuery({ queryKey: ['admin-overview'], queryFn: () => api.get<Overview>('/admin/overview', token), enabled: !!token });
  const { data: agents } = useQuery({ queryKey: ['admin-agents'], queryFn: () => api.get<AgentStatus>('/admin/agents', token), enabled: !!token });
  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: () => api.get<AdminUser[]>('/admin/users', token), enabled: !!token });

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => api.patch(`/admin/users/${v.id}/status`, { status: v.status }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const setRole = useMutation({
    mutationFn: (v: { id: string; role: string }) => api.patch(`/admin/users/${v.id}/role`, { role: v.role }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const stats: [string, number | undefined][] = [
    ['Students', ov?.students], ['Teachers', ov?.teachers], ['Admins', ov?.admins],
    ['Bookings', ov?.bookings], ['Products', ov?.products], ...(isSuper ? [['Tenants', ov?.tenants] as [string, number | undefined]] : []),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin control center</h1>
        <p className="text-gray-500">{isSuper ? 'Platform-wide control (super admin)' : 'School-wide control'}</p>
      </div>

      {/* Overview */}
      <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([label, val]) => (
          <Card key={label}><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold">{val ?? 0}</p></Card>
        ))}
      </section>

      {/* Multi-agent AI status */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Multi-agent AI</h2>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${agents?.online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className={`h-2 w-2 rounded-full ${agents?.online ? 'bg-green-500' : 'bg-gray-400'}`} />
            {agents?.online ? 'online' : 'offline'}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents?.agents.map((a) => (
            <Card key={a.name}>
              <p className="font-semibold text-brand">{a.name}</p>
              <p className="mt-1 text-xs text-gray-500">{a.capabilities.join(' · ')}</p>
            </Card>
          ))}
        </div>
      </section>

      <InvitePanel />

      {/* User management */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">User management</h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-gray-500">
              <th className="py-2">Name</th><th>Email</th><th>Role</th><th>Status</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u._id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{u.name}</td>
                  <td className="text-gray-500">{u.email}</td>
                  <td>
                    {isSuper && u.role !== 'super_admin' ? (
                      <select value={u.role} onChange={(e) => setRole.mutate({ id: u._id, role: e.target.value })} className="rounded border px-2 py-1">
                        {['student', 'teacher', 'parent', 'school_admin'].map((r) => <option key={r}>{r}</option>)}
                      </select>
                    ) : <span className="capitalize">{u.role.replace('_', ' ')}</span>}
                  </td>
                  <td><span className={u.status === 'active' ? 'text-green-600' : 'text-red-600'}>{u.status}</span></td>
                  <td className="text-right">
                    {u.role !== 'super_admin' && (
                      <button
                        onClick={() => setStatus.mutate({ id: u._id, status: u.status === 'active' ? 'suspended' : 'active' })}
                        className={`rounded-lg px-3 py-1 text-xs font-medium ${u.status === 'active' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                        {u.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users?.length && <p className="py-4 text-gray-500">No users found.</p>}
        </Card>
      </section>
      <VerificationPanel />
    </div>
  );
}

function VerificationPanel() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['verif-pending'], queryFn: () => api.get<{ _id: string; headline?: string; verification?: { docType?: string; docNumber?: string }; userId?: { name?: string } }[]>('/tutors/verifications/pending', token), enabled: !!token });
  const act = async (id: string, approved: boolean) => {
    try { await api.patch(`/tutors/${id}/verify`, { approved }, token); qc.invalidateQueries({ queryKey: ['verif-pending'] }); }
    catch (e) { alert((e as Error).message); }
  };
  return (
    <section className="mt-6">
      <Card>
        <h2 className="mb-2 font-semibold">Tutor verifications</h2>
        <div className="space-y-2">
          {data?.map((t) => (
            <div key={t._id} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm last:border-0">
              <span>{t.userId?.name ?? t.headline ?? 'Tutor'} · {t.verification?.docType} · {t.verification?.docNumber}</span>
              <span className="flex gap-2">
                <button onClick={() => act(t._id, true)} className="rounded-lg bg-green-50 px-3 py-1 text-xs font-medium text-green-700">Approve</button>
                <button onClick={() => act(t._id, false)} className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-600">Reject</button>
              </span>
            </div>
          ))}
          {!data?.length && <p className="text-sm text-gray-500">No pending verifications.</p>}
        </div>
      </Card>
    </section>
  );
}
