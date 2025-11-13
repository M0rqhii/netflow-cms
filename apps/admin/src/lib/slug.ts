export function slugify(input: string): string {
  if (!input) return '';
  return input
    .toString()
    .normalize('NFD') // split accented characters into base + diacritics
    .replace(/\p{Diacritic}+/gu, '') // remove diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // drop non-url-safe chars
    .replace(/\s+/g, '-') // spaces → hyphens
    .replace(/-+/g, '-') // collapse hyphens
    .replace(/^-|-$/g, ''); // trim hyphens
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

