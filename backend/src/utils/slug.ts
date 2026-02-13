export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

export function generateUniqueSlug(base: string, suffix?: string): string {
  const baseSlug = slugify(base);
  if (suffix) return `${baseSlug}-${suffix}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${baseSlug}-${rand}`;
}
