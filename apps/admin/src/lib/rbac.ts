export type SiteRole = 'owner' | 'admin' | 'editor' | 'viewer' | string;

export function canInvite(role: SiteRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canManageUsers(role: SiteRole): boolean {
  return canInvite(role);
}

export function canEditContent(role: SiteRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor';
}

export function canReviewContent(role: SiteRole): boolean {
  return role === 'owner' || role === 'admin';
}
