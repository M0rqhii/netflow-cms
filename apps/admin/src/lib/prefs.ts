export function setLastTenantSlug(slug: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('nf-last-tenant', slug);
    // Track recently used tenants
    const recent = getRecentlyUsedTenants();
    const updated = [slug, ...recent.filter(s => s !== slug)].slice(0, 5);
    localStorage.setItem('nf-recent-tenants', JSON.stringify(updated));
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

export function getRecentlyUsedTenants(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('nf-recent-tenants');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearRecentlyUsedTenants() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('nf-recent-tenants');
  } catch {}
}

export function getPinnedTenants(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('nf-pinned-tenants');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function togglePinTenant(slug: string): void {
  if (typeof window === 'undefined') return;
  try {
    const pinned = getPinnedTenants();
    const index = pinned.indexOf(slug);
    if (index >= 0) {
      pinned.splice(index, 1);
    } else {
      pinned.push(slug);
    }
    localStorage.setItem('nf-pinned-tenants', JSON.stringify(pinned));
  } catch {}
}

export function isTenantPinned(slug: string): boolean {
  return getPinnedTenants().includes(slug);
}

