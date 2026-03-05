type RoleCarrier = {
  role?: string | null;
  platformRole?: string | null;
  systemRole?: string | null;
  isSuperAdmin?: boolean | null;
};

function normalizeRole(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

export function isPlatformAdminValue(value: string | null | undefined): boolean {
  return normalizeRole(value) === 'platform_admin';
}

export function isPlatformPowerUser(user: RoleCarrier | null | undefined): boolean {
  if (!user) return false;
  return (
    Boolean(user.isSuperAdmin) ||
    normalizeRole(user.systemRole) === 'super_admin' ||
    normalizeRole(user.role) === 'super_admin' ||
    isPlatformAdminValue(user.role) ||
    isPlatformAdminValue(user.platformRole)
  );
}

