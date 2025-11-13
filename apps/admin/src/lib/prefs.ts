export function setLastTenantSlug(slug: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('nf-last-tenant', slug);
  } catch {}
}

export function getLastTenantSlug(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('nf-last-tenant');
  } catch {
    return null;
  }
}

