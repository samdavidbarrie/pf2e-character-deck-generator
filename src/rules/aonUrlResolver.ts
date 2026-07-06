/**
 * Placeholder AoN URL resolver.
 * MVP: stores manually-provided URLs and generates best-guess links.
 * Post-MVP: implement a proper name→URL mapping table.
 */

const BASE = 'https://2e.aonprd.com';

const CATEGORY_PATH: Record<string, string> = {
  spell: 'Spells',
  feat: 'Feats',
  action: 'Actions',
  condition: 'Conditions',
  equipment: 'Equipment',
};

/**
 * Attempts a best-guess AoN URL for a given name and category.
 * Returns undefined when no reliable guess can be made.
 */
export function resolveAonUrl(name: string, category: string): string | undefined {
  const path = CATEGORY_PATH[category.toLowerCase()];
  if (!path) return undefined;
  const slug = name.trim().replace(/\s+/g, '%20');
  return `${BASE}/${path}.aspx?ID=0&Name=${slug}`;
}

/**
 * Build a search URL for AoN as a fallback.
 */
export function aonSearchUrl(name: string): string {
  return `${BASE}/Search.aspx?query=${encodeURIComponent(name)}`;
}
