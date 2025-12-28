"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { EmptyState, Skeleton } from '@repo/ui';
import { Badge, getRoleBadgeClasses } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from '@/hooks/useTranslations';
import { 
  fetchPlatformUsers, 
  createPlatformUser, 
  updatePlatformUser, 
  deletePlatformUser,
  type PlatformUser 
} from '@/lib/api';

// Map old role names to new role names
const mapOldRoleToSiteRole = (role: string | undefined): string => {
  if (!role) return 'viewer';
  const mapping: Record<string, string> = {
    'super_admin': 'owner', // Super admin maps to owner in site context
    'tenant_admin': 'admin',
    'editor': 'editor',
    'viewer': 'viewer',
  };
  return mapping[role] || role;
};

const mapOldRoleToSystemRole = (role: string | undefined): string | undefined => {
  if (!role) return undefined;
  if (role === 'super_admin') return 'super_admin';
  return undefined;
};

const formatRoleName = (role: string): string => {
  // Convert snake_case to Title Case
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function PlatformUsersPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const toast = useToast();

  // Create form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [platformRole, setPlatformRole] = useState('user');
  const [systemRole, setSystemRole] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Edit form state
  const [editRole, setEditRole] = useState('');
  const [editSiteRole, setEditSiteRole] = useState('');
  const [editPlatformRole, setEditPlatformRole] = useState('');
  const [editSystemRole, setEditSystemRole] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  
  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await fetchPlatformUsers(pagination.page, pagination.pageSize);
      setUsers(result.data);
      setPagination(result.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('platformUsers.failedToLoadUsers');
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  // Separate system users from organization users
  const systemUsers = useMemo(() => {
    return users.filter(u => 
      u.isSuperAdmin || 
      u.systemRole === 'super_admin' ||
      u.systemRole === 'system_admin' ||
      u.systemRole === 'system_dev' ||
      u.systemRole === 'system_support' ||
      u.role === 'super_admin' // Backward compatibility
    );
  }, [users]);

  const organizationUsers = useMemo(() => {
    return users.filter(u => 
      !u.isSuperAdmin && 
      !['super_admin', 'system_admin', 'system_dev', 'system_support'].includes(u.systemRole || '') &&
      u.role !== 'super_admin' // Backward compatibility
    );
  }, [users]);

  const onCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      await createPlatformUser({
        email,
        password,
        role: systemRole || role,
        platformRole: platformRole === 'user' ? undefined : platformRole,
        permissions: selectedPermissions.length > 0 ? selectedPermissions as any : undefined,
      });
      setEmail('');
      setPassword('');
      setRole('viewer');
      setPlatformRole('user');
      setSystemRole('');
      setSelectedPermissions([]);
      setShowCreateForm(false);
      toast.push({
        tone: 'success',
        message: `${email} ${t('users.userCreatedSuccessfully')}`,
      });
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('platformUsers.failedToCreateUser');
      toast.push({
        tone: 'error',
        message,
      });
    }
  };

  const onUpdateUser = async (userId: string) => {
    try {
      // If editing a system user, use systemRole; otherwise use role
      const isSystemUser = systemUsers.some(u => u.id === userId);
      
      // Map old role names to new ones before sending to backend
      const mappedSiteRole = !isSystemUser ? mapOldRoleToSiteRole(editSiteRole) : undefined;
      const mappedSystemRole = isSystemUser ? (editSystemRole || mapOldRoleToSystemRole(editRole)) : undefined;
      
      // Build update payload - only send role if it's a system user or if siteRole is not set
      const updatePayload: any = {};
      
      // Only add platformRole if it's not 'user'
      if (editPlatformRole && editPlatformRole !== 'user') {
        updatePayload.platformRole = editPlatformRole;
      }
      
      // Only add permissions if there are any
      if (editPermissions.length > 0) {
        updatePayload.permissions = editPermissions as any;
      }
      
      if (isSystemUser) {
        // For system users, use systemRole
        if (mappedSystemRole) {
          updatePayload.systemRole = mappedSystemRole;
          updatePayload.role = mappedSystemRole; // Backward compatibility
        }
      } else {
        // For organization users, use siteRole and don't send role if it's an old name
        if (mappedSiteRole) {
          updatePayload.siteRole = mappedSiteRole;
          // Only send role if it's not an old name that was mapped
          const oldRoleNames = ['tenant_admin', 'super_admin'];
          if (!oldRoleNames.includes(editRole)) {
            updatePayload.role = editRole;
          }
        }
      }
      
      await updatePlatformUser(userId, updatePayload);
      setEditingUserId(null);
      toast.push({
        tone: 'success',
        message: t('platformUsers.userUpdatedSuccessfully'),
      });
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('platformUsers.failedToUpdateUser');
      toast.push({
        tone: 'error',
        message,
      });
    }
  };

  const onDeleteUser = async (userId: string) => {
    if (!confirm(t('platformUsers.areYouSureDeleteUser'))) return;

    try {
      await deletePlatformUser(userId);
      toast.push({
        tone: 'success',
        message: t('platformUsers.userDeletedSuccessfully'),
      });
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('platformUsers.failedToDeleteUser');
      toast.push({
        tone: 'error',
        message,
      });
    }
  };

  const startEdit = (user: PlatformUser) => {
    setEditingUserId(user.id);
    // Map old role names to new ones before setting form values
    const mappedSiteRole = user.siteRole || mapOldRoleToSiteRole(user.role) || 'viewer';
    setEditRole(user.role || 'viewer');
    setEditSiteRole(mappedSiteRole);
    setEditPlatformRole(user.platformRole || 'user');
    // For system users, use systemRole or fall back to role if it's super_admin
    setEditSystemRole(user.systemRole || mapOldRoleToSystemRole(user.role) || '');
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditRole('');
    setEditSiteRole('');
    setEditPlatformRole('');
    setEditSystemRole('');
    setEditPermissions([]);
  };

  return (
    <div className="container py-8">
      {loading && users.length === 0 ? (
        <>
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </>
      ) : (
        <>
      <h1 className="text-2xl font-bold mb-6">Platform Users</h1>

      {/* Create User Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Platform User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="system-role" className="block text-sm font-medium mb-1">System Role (optional)</label>
                <select
                  id="system-role"
                  className="w-full border rounded-md px-3 py-2"
                  value={systemRole}
                  onChange={(e) => setSystemRole(e.target.value)}
                  aria-describedby="system-role-hint"
                >
                  <option value="">None (Organization User)</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="system_admin">System Admin</option>
                  <option value="system_dev">System Dev</option>
                  <option value="system_support">System Support</option>
                </select>
                <p id="system-role-hint" className="text-xs text-muted mt-1">Select a system role if this user should have platform-wide permissions</p>
              </div>
              {!systemRole && (
                <>
                  <div>
                    <label htmlFor="site-role" className="block text-sm font-medium mb-1">Site Role</label>
                    <select
                      id="site-role"
                      className="w-full border rounded-md px-3 py-2"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="editor-in-chief">Editor-in-Chief</option>
                      <option value="marketing">Marketing</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="platform-role" className="block text-sm font-medium mb-1">Platform Role</label>
                    <select
                      id="platform-role"
                      className="w-full border rounded-md px-3 py-2"
                      value={platformRole}
                      onChange={(e) => setPlatformRole(e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="editor-in-chief">Editor-in-Chief</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <Button type="submit">Create User</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!showCreateForm && (
        <Button onClick={() => setShowCreateForm(true)} className="mb-6">
          {t('platformUsers.createNewUser')}
        </Button>
      )}

      {/* Table 1: System Administrators */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('platformUsers.systemAdministrators')}</CardTitle>
        </CardHeader>
        <CardContent>
          {systemUsers.length === 0 ? (
            <EmptyState message={t('platformUsers.noSystemAdministratorsFound')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold">{t('platformUsers.email')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('platformUsers.systemRole')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('platformUsers.organization')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('platformUsers.created')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('platformUsers.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {systemUsers.map((u) => (
                    <tr key={u.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">{u.email}</td>
                      <td className="py-3 px-4">
                        {editingUserId === u.id ? (
                          <>
                            <label htmlFor={`edit-system-role-${u.id}`} className="sr-only">{t('platformUsers.editSystemRole')} {u.email}</label>
                            <select
                              id={`edit-system-role-${u.id}`}
                              className="border rounded-md px-2 py-1 text-sm"
                              value={editSystemRole || (u.role === 'super_admin' ? 'super_admin' : '')}
                              onChange={(e) => setEditSystemRole(e.target.value)}
                              aria-label={`${t('platformUsers.editSystemRole')} ${u.email}`}
                            >
                            <option value="super_admin">{t('platformUsers.superAdmin')}</option>
                            <option value="system_admin">{t('platformUsers.systemAdmin')}</option>
                            <option value="system_dev">{t('platformUsers.systemDev')}</option>
                            <option value="system_support">{t('platformUsers.systemSupport')}</option>
                          </select>
                          </>
                        ) : (
                          u.isSuperAdmin || u.systemRole === 'super_admin' || u.role === 'super_admin' ? (
                            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold whitespace-nowrap">
                              ⭐ SUPER ADMIN
                            </Badge>
                          ) : (
                            <Badge 
                              variant="outline" 
                              className={getRoleBadgeClasses(u.systemRole || mapOldRoleToSystemRole(u.role) || u.role || '')}
                            >
                              {formatRoleName(u.systemRole || mapOldRoleToSystemRole(u.role) || u.role || '')}
                            </Badge>
                          )
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {u.tenant?.name || u.tenant?.slug || '-'}
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {editingUserId === u.id ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => onUpdateUser(u.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => startEdit(u)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => onDeleteUser(u.id)}>
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table 2: Organization Users */}
      <Card>
        <CardHeader>
          <CardTitle>{t('platformUsers.organizationUsers')}</CardTitle>
        </CardHeader>
        <CardContent>
          {organizationUsers.length === 0 ? (
            <EmptyState message={t('platformUsers.noOrganizationUsersFound')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold">{t('platformUsers.email')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('platformUsers.siteRole')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('platformUsers.platformRole')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('platformUsers.organization')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('platformUsers.created')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('platformUsers.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {organizationUsers.map((u) => (
                    <tr key={u.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">{u.email}</td>
                      <td className="py-3 px-4">
                        {editingUserId === u.id ? (
                          <select
                            className="border rounded-md px-2 py-1 text-sm"
                            value={editSiteRole}
                            onChange={(e) => setEditSiteRole(e.target.value)}
                          >
                            <option value="viewer">{t('users.viewer')}</option>
                            <option value="editor">{t('users.editor')}</option>
                            <option value="editor-in-chief">Editor-in-Chief</option>
                            <option value="marketing">Marketing</option>
                            <option value="admin">{t('users.admin')}</option>
                            <option value="owner">Owner</option>
                          </select>
                        ) : (
                          <Badge 
                            variant="outline"
                            className={getRoleBadgeClasses(u.siteRole || mapOldRoleToSiteRole(u.role) || 'viewer')}
                          >
                            {formatRoleName(u.siteRole || mapOldRoleToSiteRole(u.role) || 'viewer')}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {editingUserId === u.id ? (
                          <select
                            className="border rounded-md px-2 py-1 text-sm"
                            value={editPlatformRole}
                            onChange={(e) => setEditPlatformRole(e.target.value)}
                          >
                            <option value="user">User</option>
                            <option value="editor-in-chief">Editor-in-Chief</option>
                            <option value="admin">{t('users.admin')}</option>
                            <option value="owner">Owner</option>
                          </select>
                        ) : (
                          <Badge 
                            variant="outline"
                            className={getRoleBadgeClasses(u.platformRole || 'user')}
                          >
                            {formatRoleName(u.platformRole || 'user')}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {u.tenant?.name || u.tenant?.slug || '-'}
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {editingUserId === u.id ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => onUpdateUser(u.id)}>
                              {t('common.save')}
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              {t('common.cancel')}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => startEdit(u)}>
                              {t('common.edit')}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => onDeleteUser(u.id)}>
                              {t('common.delete')}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
