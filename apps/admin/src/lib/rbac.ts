export type TenantRole = 'owner' | 'admin' | 'editor' | 'viewer' | string;

export function canInvite(role: TenantRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canManageUsers(role: TenantRole): boolean {
  return canInvite(role);
}

export function canEditContent(role: TenantRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor';
}

export function canReviewContent(role: TenantRole): boolean {
  return role === 'owner' || role === 'admin';
}

