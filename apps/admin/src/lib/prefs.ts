export function setLastSiteSlug(slug: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('nf-last-site', slug);
    // Track recently used sites
    const recent = getRecentlyUsedSites();
    const updated = [slug, ...recent.filter(s => s !== slug)].slice(0, 5);
    localStorage.setItem('nf-recent-sites', JSON.stringify(updated));
  } catch {}
}

export function getLastSiteSlug(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('nf-last-site');
  } catch {
    return null;
  }
}

export function getRecentlyUsedSites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('nf-recent-sites');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearRecentlyUsedSites() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('nf-recent-sites');
  } catch {}
}

export function getPinnedSites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('nf-pinned-sites');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function togglePinSite(slug: string): void {
  if (typeof window === 'undefined') return;
  try {
    const pinned = getPinnedSites();
    const index = pinned.indexOf(slug);
    if (index >= 0) {
      pinned.splice(index, 1);
    } else {
      pinned.push(slug);
    }
    localStorage.setItem('nf-pinned-sites', JSON.stringify(pinned));
  } catch {}
}

export function isSitePinned(slug: string): boolean {
  return getPinnedSites().includes(slug);
}
