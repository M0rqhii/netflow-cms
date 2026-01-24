"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { EmptyState, Skeleton } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { fetchSiteUsers, fetchMySites, createUser, updateUserRole, fetchSiteInvites, inviteUserToSite, revokeInvite } from '@/lib/api';
import type { UserSummary, InviteSummary } from '@/lib/api';
import type { SiteInfo } from '@repo/sdk';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from '@/hooks/useTranslations';

export default function SiteUsersPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [invites, setInvites] = useState<InviteSummary[]>([]);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [createEmail, setCreateEmail] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [role, setRole] = useState('editor');
  const [inviteRole, setInviteRole] = useState('editor');
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const toast = useToast();

  const normalizeRole = (value: string) => (value === 'site_admin' ? 'org_admin' : value);
  const roleLabel = (value: string) => {
    const normalized = normalizeRole(value);
    switch (normalized) {
      case 'org_admin':
        return t('users.admin');
      case 'super_admin':
        return t('users.superAdmin');
      case 'editor':
        return t('users.editor');
      case 'viewer':
        return t('users.viewer');
      default:
        return normalized;
    }
  };


  useEffect(() => {
    (async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch sites to get siteId from slug
        const sites = await fetchMySites();
        const site = sites.find((s: SiteInfo) => s.site.slug === slug);
        
        if (!site) {
          throw new Error(`Site with slug "${slug}" not found`);
        }

        const id = site.siteId;
        setSiteId(id);

        // Fetch users and invites in parallel
        const [usersData, invitesData] = await Promise.all([
          fetchSiteUsers(id),
          fetchSiteInvites(id),
        ]);

        setUsers(usersData);
        setInvites(invitesData);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('users.failedToLoadUsers');
        toast.push({
          tone: 'error',
          message,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, toast, t]);

  const refreshData = async () => {
    if (!siteId) return;

    try {
      const [usersData, invitesData] = await Promise.all([
        fetchSiteUsers(siteId),
        fetchSiteInvites(siteId),
      ]);
      setUsers(usersData);
      setInvites(invitesData);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('users.failedToRefreshData');
      toast.push({
        tone: 'error',
        message,
      });
    }
  };

  const filteredUsers = users.filter(u =>
    (!query || u.email.toLowerCase().includes(query.toLowerCase())) &&
    (!roleFilter || normalizeRole(u.role) === roleFilter)
  );

  const onCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !createEmail || !createPassword) return;

    try {
      setCreating(true);
      await createUser(siteId, { email: createEmail, password: createPassword, role, preferredLanguage: 'en' });
      setCreateEmail('');
      setCreatePassword('');
      toast.push({
        tone: 'success',
        message: `${t('users.userCreatedSuccessfully')} ${createEmail}`,
      });
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('users.failedToCreateUser');
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setCreating(false);
    }
  };

  const onUpdateRole = async (userId: string, newRole: string) => {
    if (!siteId) return;

    try {
      await updateUserRole(siteId, userId, newRole);
      setEditingUserId(null);
      toast.push({
        tone: 'success',
        message: t('users.userRoleUpdatedSuccessfully'),
      });
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('users.failedToUpdateUserRole');
      toast.push({
        tone: 'error',
        message,
      });
    }
  };

  const startEditRole = (user: UserSummary) => {
    setEditingUserId(user.id);
    setEditingRole(normalizeRole(user.role));
  };

  const cancelEditRole = () => {
    setEditingUserId(null);
    setEditingRole('');
  };

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !inviteEmail) return;

    try {
      setSending(true);
      await inviteUserToSite(inviteEmail, inviteRole, siteId);
      setInviteEmail('');
      toast.push({
        tone: 'success',
        message: `${t('users.inviteSentTo')} ${inviteEmail}`,
      });
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('users.failedToSendInvite');
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setSending(false);
    }
  };

  const onRevokeInvite = async (inviteId: string) => {
    if (!siteId) return;

    try {
      await revokeInvite(siteId, inviteId);
      toast.push({
        tone: 'success',
        message: t('users.inviteRevoked'),
      });
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('users.failedToRevokeInvite');
      toast.push({
        tone: 'error',
        message,
      });
    }
  };

  const filteredInvites = invites.filter(iv =>
    (!query || iv.email.toLowerCase().includes(query.toLowerCase())) &&
    (!roleFilter || normalizeRole(iv.role) === roleFilter)
  );

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
        {/* Header */}
        <div className="mb-2 sm:mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1.5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-0.5 sm:mb-1">
                {t('users.title')}
              </h1>
              <p className="text-[10px] sm:text-xs text-muted">
                {t('users.manageUsersAndInvites')} {slug}
              </p>
            </div>
            <Link href={`/sites/${encodeURIComponent(slug)}`}>
              <Button variant="outline" className="w-full sm:w-auto text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3">{t('common.back')}</Button>
            </Link>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {/* Members table */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
              <CardTitle className="text-sm sm:text-base font-semibold">{t('users.members')}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            {loading ? (
              <div className="py-8">
                <Skeleton variant="text" width={200} height={24} className="mb-4" />
                <Skeleton variant="rectangular" width="100%" height={200} />
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 mb-2">
                  <Input
                    label={t('common.search')}
                    placeholder={t('users.searchByEmail')}
                    value={query}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                    className="w-full sm:max-w-xs text-[10px] sm:text-xs h-8 sm:h-9"
                  />
                  <div>
                    <label htmlFor="role-filter" className="sr-only">{t('users.filterByRole')}</label>
                    <select
                      id="role-filter"
                      className="border rounded-md px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs h-8 sm:h-9 bg-card text-foreground w-full sm:w-auto"
                      value={roleFilter}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRoleFilter(e.target.value)}
                      aria-label={t('users.filterByRole')}
                    >
                      <option value="">{t('users.allRoles')}</option>
                      <option value="org_admin">{t('users.admin')}</option>
                      <option value="editor">{t('users.editor')}</option>
                      <option value="viewer">{t('users.viewer')}</option>
                    </select>
                  </div>
                </div>
                {filteredUsers.length === 0 ? (
                  <EmptyState
                    title={t('users.noUsersFound')}
                    description={query || roleFilter ? t('users.tryAdjustingSearch') : t('users.noUsersAddedYet')}
                  />
                ) : (
                  <>
                    {/* Desktop table view */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <caption className="sr-only">{t('users.title')} table</caption>
                        <thead>
                          <tr className="text-left text-muted border-b border-border">
                            <th scope="col" className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('users.email')}</th>
                            <th scope="col" className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('users.role')}</th>
                            <th scope="col" className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('users.joined')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((u) => (
                            <tr key={u.id} className="border-b border-border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <td className="py-2 px-3 text-xs sm:text-sm">{u.email}</td>
                              <td className="py-2 px-3">
                                {editingUserId === u.id ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <label htmlFor={`role-edit-${u.id}`} className="sr-only">Edit role for {u.email}</label>
                                    <select
                                      id={`role-edit-${u.id}`}
                                      className="border rounded-md px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs h-7 sm:h-8 bg-card text-foreground"
                                      value={editingRole}
                                      onChange={(e) => setEditingRole(e.target.value)}
                                      aria-label={`Edit role for ${u.email}`}
                                    >
                                      <option value="super_admin">{t('users.superAdmin')}</option>
                                      <option value="org_admin">{t('users.admin')}</option>
                                      <option value="editor">{t('users.editor')}</option>
                                      <option value="viewer">{t('users.viewer')}</option>
                                    </select>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => onUpdateRole(u.id, editingRole)}
                                      aria-label={`Save role change for ${u.email}`}
                                      className="text-[10px] sm:text-xs h-7 sm:h-8 px-2"
                                    >
                                      {t('common.save')}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={cancelEditRole}
                                      aria-label={`Cancel role edit for ${u.email}`}
                                      className="text-[10px] sm:text-xs h-7 sm:h-8 px-2"
                                    >
                                      {t('common.cancel')}
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge className="text-[9px] sm:text-[10px]">{roleLabel(u.role)}</Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => startEditRole(u)}
                                      className="text-[10px] sm:text-xs h-7 sm:h-8 px-2"
                                    >
                                      {t('users.changeRole')}
                                    </Button>
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-xs sm:text-sm text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile card view */}
                    <div className="md:hidden space-y-2">
                      {filteredUsers.map((u) => (
                        <div key={u.id} className="border border-border rounded-lg p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                          <div>
                            <div className="text-[10px] text-muted mb-0.5">{t('users.email')}</div>
                            <div className="font-medium text-xs sm:text-sm">{u.email}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted mb-0.5">{t('users.role')}</div>
                            {editingUserId === u.id ? (
                              <div className="space-y-1.5">
                                <select
                                  className="border rounded-md px-2 py-1 text-[10px] sm:text-xs h-7 sm:h-8 w-full bg-card text-foreground"
                                  value={editingRole}
                                  onChange={(e) => setEditingRole(e.target.value)}
                                >
                                  <option value="super_admin">{t('users.superAdmin')}</option>
                                  <option value="org_admin">{t('users.admin')}</option>
                                  <option value="editor">{t('users.editor')}</option>
                                  <option value="viewer">{t('users.viewer')}</option>
                                </select>
                                <div className="flex gap-1.5">
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => onUpdateRole(u.id, editingRole)}
                                    className="flex-1 text-[10px] sm:text-xs h-7 sm:h-8 px-2"
                                  >
                                    {t('common.save')}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={cancelEditRole}
                                    className="flex-1 text-[10px] sm:text-xs h-7 sm:h-8 px-2"
                                  >
                                    {t('common.cancel')}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge className="text-[9px] sm:text-[10px]">{roleLabel(u.role)}</Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEditRole(u)}
                                  className="text-[10px] sm:text-xs h-7 sm:h-8 px-2"
                                >
                                  {t('users.changeRole')}
                                </Button>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-[10px] text-muted mb-0.5">{t('users.joined')}</div>
                            <div className="text-xs sm:text-sm">{new Date(u.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

          {/* Create User form */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
              <CardTitle className="text-sm sm:text-base font-semibold">{t('users.createUser')}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-2 sm:pb-3">
              <form onSubmit={onCreateUser} className="space-y-2 w-full max-w-lg">
                <Input
                  label={t('users.emailAddress')}
                  type="email"
                  value={createEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateEmail(e.target.value)}
                  required
                  placeholder={t('users.emailPlaceholder')}
                  helperText={t('users.emailHelperText')}
                />
                <Input
                  label={t('auth.password')}
                  type="password"
                  value={createPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreatePassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  helperText={t('users.passwordHelperText')}
                  minLength={6}
                />
                <div>
                  <label htmlFor="create-user-role" className="block text-sm font-medium mb-1">
                    {t('users.role')}
                    <span className="text-red-500 ml-1" aria-label="required">*</span>
                  </label>
                  <select
                    id="create-user-role"
                    className="border rounded-md w-full px-2 sm:px-3 py-1.5 sm:py-2 h-8 sm:h-9 bg-card text-foreground text-[10px] sm:text-xs"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    aria-required="true"
                    aria-describedby="create-user-role-hint"
                  >
                    <option value="org_admin">{t('users.admin')}</option>
                    <option value="editor">{t('users.editor')}</option>
                    <option value="viewer">{t('users.viewer')}</option>
                  </select>
                  <p id="create-user-role-hint" className="text-xs text-muted mt-1">{t('users.roleHelperText')}</p>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCreateEmail('');
                      setCreatePassword('');
                    }}
                    className="w-full sm:w-auto text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" variant="primary" disabled={creating} className="w-full sm:w-auto text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3">
                    {creating ? t('users.creating') : t('users.createUser')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Invite User form */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
              <CardTitle className="text-sm sm:text-base font-semibold">{t('users.inviteUser')}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-2 sm:pb-3">
              <form onSubmit={onInvite} className="space-y-2 w-full max-w-lg">
                <Input
                  label={t('users.emailAddress')}
                  type="email"
                  value={inviteEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
                  required
                  placeholder={t('users.emailPlaceholder')}
                  helperText={t('users.inviteEmailHelperText')}
                />
                <div>
                  <label htmlFor="invite-user-role" className="block text-sm font-medium mb-1">
                    {t('users.role')}
                    <span className="text-red-500 ml-1" aria-label="required">*</span>
                  </label>
                  <select
                    id="invite-user-role"
                    className="border rounded-md w-full px-2 sm:px-3 py-1.5 sm:py-2 h-8 sm:h-9 bg-card text-foreground text-[10px] sm:text-xs"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    required
                    aria-required="true"
                    aria-describedby="invite-user-role-hint"
                  >
                    <option value="org_admin">{t('users.admin')}</option>
                    <option value="editor">{t('users.editor')}</option>
                    <option value="viewer">{t('users.viewer')}</option>
                  </select>
                  <p id="invite-user-role-hint" className="text-xs text-muted mt-1">{t('users.inviteRoleHelperText')}</p>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-1.5">
                  <Button type="submit" variant="primary" disabled={sending} className="w-full sm:w-auto text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3">
                    {sending ? t('users.sending') : t('users.sendInvite')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Pending Invites */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
              <CardTitle className="text-sm sm:text-base font-semibold">{t('users.pendingInvites')}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
              {loading ? (
                <div className="py-6">
                  <Skeleton variant="text" width={180} height={20} className="mb-3" />
                  <Skeleton variant="rectangular" width="100%" height={160} />
                </div>
              ) : filteredInvites.length === 0 ? (
                <EmptyState
                  title={t('users.noPendingInvites')}
                  description={t('users.invitesWillAppear')}
                />
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <caption className="sr-only">{t('users.pendingInvites')} table</caption>
                      <thead>
                        <tr className="text-left text-muted border-b border-border">
                          <th scope="col" className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('users.email')}</th>
                          <th scope="col" className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('users.role')}</th>
                          <th scope="col" className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('users.sent')}</th>
                          <th scope="col" className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('common.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInvites.map((invite) => (
                          <tr key={invite.id} className="border-b border-border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="py-2 px-3 text-xs sm:text-sm">{invite.email}</td>
                            <td className="py-2 px-3">
                              <Badge className="text-[9px] sm:text-[10px]">{roleLabel(invite.role)}</Badge>
                            </td>
                            <td className="py-2 px-3 text-xs sm:text-sm text-muted">{new Date(invite.createdAt).toLocaleDateString()}</td>
                            <td className="py-2 px-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onRevokeInvite(invite.id)}
                                className="text-[10px] sm:text-xs h-7 sm:h-8 px-2"
                              >
                                {t('users.revoke')}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-2">
                    {filteredInvites.map((invite) => (
                      <div key={invite.id} className="border border-border rounded-lg p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                        <div>
                          <div className="text-[10px] text-muted mb-0.5">{t('users.email')}</div>
                          <div className="font-medium text-xs sm:text-sm">{invite.email}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted mb-0.5">{t('users.role')}</div>
                          <Badge className="text-[9px] sm:text-[10px]">{roleLabel(invite.role)}</Badge>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted mb-0.5">{t('users.sent')}</div>
                          <div className="text-xs sm:text-sm">{new Date(invite.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRevokeInvite(invite.id)}
                            className="text-[10px] sm:text-xs h-7 sm:h-8 px-2"
                          >
                            {t('users.revoke')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
