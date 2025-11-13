"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchMyTenants, fetchTenantUsers, fetchTenantInvites, inviteUser, revokeInvite, type UserSummary, type InviteSummary } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { canInvite } from '@/lib/rbac';
import type { TenantInfo } from '@repo/sdk';

export default function TenantUsersPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [invites, setInvites] = useState<InviteSummary[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [uPage, setUPage] = useState(1);
  const [iPage, setIPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [uSort, setUSort] = useState<{ key: 'email' | 'role' | 'createdAt'; dir: 'asc' | 'desc' }>({ key: 'email', dir: 'asc' });
  const [iSort, setISort] = useState<{ key: 'email' | 'role' | 'createdAt'; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchMyTenants();
        const t = list.find((x) => x.tenant.slug === slug) || null;
        if (!t) setError('Tenant not found');
        setTenant(t);
        if (t) {
          const [u, inv] = await Promise.all([
            fetchTenantUsers(t.tenantId).catch(() => []),
            fetchTenantInvites(t.tenantId).catch(() => []),
          ]);
          setUsers(u);
          setInvites(inv);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tenant');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSending(true);
    setError(null);
    try {
      await inviteUser(tenant.tenantId, email, role);
      setEmail('');
      const inv = await fetchTenantInvites(tenant.tenantId).catch(() => []);
      setInvites(inv);
      push({ tone: 'success', title: 'Invitation sent', message: `Invite sent to ${email}` });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite');
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="container py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users · {slug}</h1>
        <Link href={`/tenant/${encodeURIComponent(slug)}`} className="btn btn-outline">Back</Link>
      </div>
      <div className="card"><div className="card-body">
        {loading ? (
          <p className="text-muted">Loading...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <div className="space-y-4">
            {/* Members table */}
            <div>
              <h2 className="font-semibold mb-2">Members</h2>
              <div className="flex items-center gap-2 mb-3">
                <input className="border rounded p-2 w-full max-w-xs" placeholder="Search email" value={query} onChange={(e)=>{ setQuery(e.target.value); setUPage(1); }} />
                <select className="border rounded p-2" value={roleFilter} onChange={(e)=>{ setRoleFilter(e.target.value); setUPage(1); }}>
                  <option value="">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <select className="border rounded p-2" value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value)||10); setUPage(1); setIPage(1); }}>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                </select>
              </div>
              {users.length === 0 ? (
                <p className="text-muted text-sm">No users yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted">
                        <th className="py-2">
                          <button className="hover:underline" onClick={() => setUSort(s => ({ key: 'email', dir: s.key==='email' && s.dir==='asc' ? 'desc' : 'asc' }))}>
                            Email {uSort.key==='email' ? (uSort.dir==='asc' ? '↑' : '↓') : ''}
                          </button>
                        </th>
                        <th className="py-2">
                          <button className="hover:underline" onClick={() => setUSort(s => ({ key: 'role', dir: s.key==='role' && s.dir==='asc' ? 'desc' : 'asc' }))}>
                            Role {uSort.key==='role' ? (uSort.dir==='asc' ? '↑' : '↓') : ''}
                          </button>
                        </th>
                        {users.some(u => !!u.createdAt) && (
                          <th className="py-2">
                            <button className="hover:underline" onClick={() => setUSort(s => ({ key: 'createdAt', dir: s.key==='createdAt' && s.dir==='asc' ? 'desc' : 'asc' }))}>
                              Joined {uSort.key==='createdAt' ? (uSort.dir==='asc' ? '↑' : '↓') : ''}
                            </button>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(u => (!query || u.email.toLowerCase().includes(query.toLowerCase())) && (!roleFilter || u.role === roleFilter))
                        .sort((a,b) => {
                          const dir = uSort.dir === 'asc' ? 1 : -1;
                          if (uSort.key === 'email') return a.email.localeCompare(b.email) * dir;
                          if (uSort.key === 'role') return a.role.localeCompare(b.role) * dir;
                          return ((new Date(a.createdAt || 0).getTime()) - (new Date(b.createdAt || 0).getTime())) * dir;
                        })
                        .slice((uPage-1)*pageSize, (uPage)*pageSize)
                        .map((u) => (
                        <tr key={u.id} className="border-t border-gray-200">
                          <td className="py-2">{u.email}</td>
                          <td className="py-2">{u.role}</td>
                          {users.some(x => !!x.createdAt) && (
                            <td className="py-2">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 mt-2">
                <button className="btn btn-outline" onClick={()=> setUPage(p => Math.max(1, p-1))}>Prev</button>
                <button className="btn btn-outline" onClick={()=> setUPage(p => p+1)}>Next</button>
              </div>
            </div>

            {tenant && canInvite(tenant.role) ? (
            <form onSubmit={onInvite} className="space-y-3 max-w-lg">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="border rounded w-full p-2" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select className="border rounded w-full p-2" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sending...' : 'Send Invite'}</button>
            </form>
            ) : (
              <p className="text-muted text-sm">You don't have permission to invite users for this tenant.</p>
            )}
            {/* Invites table */}
            <div>
              <h2 className="font-semibold mb-2">Pending Invitations</h2>
              {invites.length === 0 ? (
                <p className="text-muted text-sm">No pending invites.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted">
                        <th className="py-2">
                          <button className="hover:underline" onClick={() => setISort(s => ({ key: 'email', dir: s.key==='email' && s.dir==='asc' ? 'desc' : 'asc' }))}>
                            Email {iSort.key==='email' ? (iSort.dir==='asc' ? '↑' : '↓') : ''}
                          </button>
                        </th>
                        <th className="py-2">
                          <button className="hover:underline" onClick={() => setISort(s => ({ key: 'role', dir: s.key==='role' && s.dir==='asc' ? 'desc' : 'asc' }))}>
                            Role {iSort.key==='role' ? (iSort.dir==='asc' ? '↑' : '↓') : ''}
                          </button>
                        </th>
                        <th className="py-2">
                          <button className="hover:underline" onClick={() => setISort(s => ({ key: 'createdAt', dir: s.key==='createdAt' && s.dir==='asc' ? 'desc' : 'asc' }))}>
                            Sent {iSort.key==='createdAt' ? (iSort.dir==='asc' ? '↑' : '↓') : ''}
                          </button>
                        </th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites
                        .filter(iv => (!query || iv.email.toLowerCase().includes(query.toLowerCase())) && (!roleFilter || iv.role === roleFilter))
                        .sort((a,b) => {
                          const dir = iSort.dir === 'asc' ? 1 : -1;
                          if (iSort.key === 'email') return a.email.localeCompare(b.email) * dir;
                          if (iSort.key === 'role') return a.role.localeCompare(b.role) * dir;
                          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
                        })
                        .slice((iPage-1)*pageSize, (iPage)*pageSize)
                        .map((iv) => (
                          <tr key={iv.id} className="border-top border-gray-200">
                            <td className="py-2">{iv.email}</td>
                            <td className="py-2">{iv.role}</td>
                            <td className="py-2">{new Date(iv.createdAt).toLocaleString()}</td>
                            <td className="py-2 text-right">
                            {tenant && canInvite(tenant.role) ? (
                              <button
                                className="btn btn-outline"
                                onClick={async () => {
                                  if (!tenant) return;
                                  try {
                                    await revokeInvite(tenant.tenantId, iv.id);
                                    setInvites((prev) => prev.filter((x) => x.id !== iv.id));
                                    push({ tone: 'success', message: 'Invitation revoked' });
                                  } catch (err) {
                                    push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to revoke' });
                                  }
                                }}
                              >
                                Revoke
                              </button>
                            ) : null}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 mt-2">
                <button className="btn btn-outline" onClick={()=> setIPage(p => Math.max(1, p-1))}>Prev</button>
                <button className="btn btn-outline" onClick={()=> setIPage(p => p+1)}>Next</button>
              </div>
            </div>
          </div>
        )}
      </div></div>
    </div>
  );
}
  const { push } = useToast();
