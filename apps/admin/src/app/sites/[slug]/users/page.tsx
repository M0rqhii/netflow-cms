"use client";

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { EmptyState, Skeleton } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';

// Mock data
const mockUsers = [
  { id: '1', email: 'admin@example.com', role: 'admin', createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: '2', email: 'editor@example.com', role: 'editor', createdAt: new Date(Date.now() - 86400000 * 15).toISOString() },
  { id: '3', email: 'viewer@example.com', role: 'viewer', createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
];

const mockInvites = [
  { id: '1', email: 'pending@example.com', role: 'editor', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
];

export default function SiteUsersPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const [loading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [sending] = useState(false);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const filteredUsers = mockUsers.filter(u =>
    (!query || u.email.toLowerCase().includes(query.toLowerCase())) &&
    (!roleFilter || u.role === roleFilter)
  );

  const filteredInvites = mockInvites.filter(iv =>
    (!query || iv.email.toLowerCase().includes(query.toLowerCase())) &&
    (!roleFilter || iv.role === roleFilter)
  );

  const onInvite = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock invite - just show alert
    alert(`Invite would be sent to ${email} with role ${role} (UI only - no backend)`);
    setEmail('');
  };

  return (
    <div className="container py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users · {slug}</h1>
        <Link href={`/sites/${encodeURIComponent(slug)}`}>
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="py-8">
              <Skeleton variant="text" width={200} height={24} className="mb-4" />
              <Skeleton variant="rectangular" width="100%" height={200} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Members table */}
              <div>
                <h2 className="font-semibold mb-2">Members</h2>
                <div className="flex items-center gap-2 mb-3">
                  <Input
                    placeholder="Search..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="max-w-xs"
                  />
                  <select
                    className="border rounded-md px-3 py-2 text-sm h-10"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
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
                    description={query || roleFilter ? "Try adjusting your filters" : "No users in this site"}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted border-b">
                          <th className="py-2">Email</th>
                          <th className="py-2">Role</th>
                          <th className="py-2">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b border-gray-200">
                            <td className="py-2">{u.email}</td>
                            <td className="py-2">
                              <Badge>{u.role}</Badge>
                            </td>
                            <td className="py-2">{new Date(u.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Invite form */}
              <div>
                <h2 className="font-semibold mb-2">Invite User</h2>
                <form onSubmit={onInvite} className="space-y-3 max-w-lg">
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="user@example.com"
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
                  </div>
                  <Button type="submit" variant="primary" disabled={sending}>
                    {sending ? 'Sending...' : 'Send Invite'}
                  </Button>
                </form>
              </div>

              {/* Pending invites */}
              <div>
                <h2 className="font-semibold mb-2">Pending Invites</h2>
                {filteredInvites.length === 0 ? (
                  <EmptyState
                    title="No pending invites"
                    description="Invites will appear here once sent"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted border-b">
                          <th className="py-2">Email</th>
                          <th className="py-2">Role</th>
                          <th className="py-2">Sent</th>
                          <th className="py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInvites.map((iv) => (
                          <tr key={iv.id} className="border-b border-gray-200">
                            <td className="py-2">{iv.email}</td>
                            <td className="py-2">
                              <Badge>{iv.role}</Badge>
                            </td>
                            <td className="py-2">{new Date(iv.createdAt).toLocaleDateString()}</td>
                            <td className="py-2 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => alert(`Invite would be revoked (UI only - no backend)`)}
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
