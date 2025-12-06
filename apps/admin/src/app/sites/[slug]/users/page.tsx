"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { EmptyState, Skeleton } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { fetchTenantUsers, fetchTenantInvites, inviteUserToTenant, revokeInvite, fetchMyTenants } from '@/lib/api';
import type { UserSummary, InviteSummary } from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';
import { useToast } from '@/components/ui/Toast';

export default function SiteUsersPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [invites, setInvites] = useState<InviteSummary[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const toast = useToast();

  useEffect(() => {
    (async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch tenants to get tenantId from slug
        const tenants = await fetchMyTenants();
        const tenant = tenants.find((t: TenantInfo) => t.tenant.slug === slug);
        
        if (!tenant) {
          throw new Error(`Site with slug "${slug}" not found`);
        }

        const id = tenant.tenantId;
        setTenantId(id);

        // Fetch users and invites in parallel
        const [usersData, invitesData] = await Promise.all([
          fetchTenantUsers(id),
          fetchTenantInvites(id),
        ]);

        setUsers(usersData);
        setInvites(invitesData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load users and invites';
        toast.push({
          tone: 'error',
          message,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, toast]);

  const refreshData = async () => {
    if (!tenantId) return;

    try {
      const [usersData, invitesData] = await Promise.all([
        fetchTenantUsers(tenantId),
        fetchTenantInvites(tenantId),
      ]);
      setUsers(usersData);
      setInvites(invitesData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh data';
      toast.push({
        tone: 'error',
        message,
      });
    }
  };

  const filteredUsers = users.filter(u =>
    (!query || u.email.toLowerCase().includes(query.toLowerCase())) &&
    (!roleFilter || u.role === roleFilter)
  );

  const filteredInvites = invites.filter(iv =>
    (!query || iv.email.toLowerCase().includes(query.toLowerCase())) &&
    (!roleFilter || iv.role === roleFilter)
  );

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !email) return;

    try {
      setSending(true);
      await inviteUserToTenant(email, role, tenantId);
      setEmail('');
      toast.push({
        tone: 'success',
        message: `Invite sent to ${email}`,
      });
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invite';
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setSending(false);
    }
  };

  const onRevokeInvite = async (inviteId: string) => {
    if (!tenantId) return;

    try {
      await revokeInvite(tenantId, inviteId);
      toast.push({
        tone: 'success',
        message: 'Invite revoked',
      });
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke invite';
      toast.push({
        tone: 'error',
        message,
      });
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted mt-1">Manage users and invites for {slug}</p>
        </div>
        <Link href={`/sites/${encodeURIComponent(slug)}`}>
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Members table */}
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8">
                <Skeleton variant="text" width={200} height={24} className="mb-4" />
                <Skeleton variant="rectangular" width="100%" height={200} />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Input
                    placeholder="Search by email..."
                    value={query}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                    className="max-w-xs"
                  />
                  <select
                    className="border rounded-md px-3 py-2 text-sm h-10"
                    value={roleFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRoleFilter(e.target.value)}
                  >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                {filteredUsers.length === 0 ? (
                  <EmptyState
                    title="No users found"
                    description={query || roleFilter ? "Try adjusting your search or filter criteria" : "No users have been added to this site yet"}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted border-b">
                          <th className="py-3 px-4 font-semibold">Email</th>
                          <th className="py-3 px-4 font-semibold">Role</th>
                          <th className="py-3 px-4 font-semibold">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-3 px-4">{u.email}</td>
                            <td className="py-3 px-4">
                              <Badge>{u.role}</Badge>
                            </td>
                            <td className="py-3 px-4 text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Invite form */}
        <Card>
          <CardHeader>
            <CardTitle>Invite User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onInvite} className="space-y-4 max-w-lg">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                placeholder="user@example.com"
                helperText="Enter the email address of the user you want to invite"
              />
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  className="border rounded-md w-full px-3 py-2 h-10"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <p className="text-xs text-muted mt-1">Select the role for the invited user</p>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={sending}>
                  {sending ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Pending invites */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8">
                <Skeleton variant="rectangular" width="100%" height={200} />
              </div>
            ) : filteredInvites.length === 0 ? (
              <EmptyState
                title="No pending invites"
                description="Invites will appear here once sent"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b">
                      <th className="py-3 px-4 font-semibold">Email</th>
                      <th className="py-3 px-4 font-semibold">Role</th>
                      <th className="py-3 px-4 font-semibold">Sent</th>
                      <th className="py-3 px-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvites.map((iv) => (
                      <tr key={iv.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">{iv.email}</td>
                        <td className="py-3 px-4">
                          <Badge>{iv.role}</Badge>
                        </td>
                        <td className="py-3 px-4 text-muted">{new Date(iv.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRevokeInvite(iv.id)}
                          >
                            Revoke
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
