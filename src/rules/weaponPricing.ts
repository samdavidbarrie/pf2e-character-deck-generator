/**
 * Fundamental rune and precious-material pricing tables for PF2e weapons and armor.
 * Source: Archives of Nethys (GM Core), https://2e.aonprd.com
 *
 * These are game rules, not user data, so they are safe to hardcode.
 */

// ---------------------------------------------------------------------------
// Fundamental rune tables
// ---------------------------------------------------------------------------

interface RuneEntry {
  level: number;
  /** Price in gold pieces. */
  gp: number;
}

/** Fundamental weapon rune prices, keyed by lowercased rune label. */
export const WEAPON_RUNE_PRICES: Record<string, RuneEntry> = {
  '+1': { level: 2, gp: 35 },
  '+2': { level: 10, gp: 935 },
  '+3': { level: 16, gp: 8_935 },
  striking: { level: 4, gp: 65 },
  'greater striking': { level: 12, gp: 1_065 },
  'major striking': { level: 19, gp: 31_065 },
};

/** Fundamental armor rune prices, keyed by lowercased rune label. */
export const ARMOR_RUNE_PRICES: Record<string, RuneEntry> = {
  '+1': { level: 5, gp: 160 },
  '+2': { level: 11, gp: 1_060 },
  '+3': { level: 18, gp: 20_560 },
  resilient: { level: 8, gp: 340 },
  'greater resilient': { level: 14, gp: 3_440 },
  'major resilient': { level: 20, gp: 49_440 },
};

// ---------------------------------------------------------------------------
// Precious material tables
// ---------------------------------------------------------------------------

interface MaterialGradeEntry {
  level: number;
  /** Flat base price in gp. */
  base: number;
  /** Additional gp added per point of Bulk (Light = 0). */
  perBulk: number;
}

type GradeMap = Record<string, MaterialGradeEntry>;

/**
 * Precious material weapon prices, keyed by lowercased material name then
 * lowercased grade string (e.g. 'cold iron' → 'low-grade').
 * Source: https://2e.aonprd.com/Equipment.aspx?Category=37&Subcategory=38
 */
export const WEAPON_MATERIAL_PRICES: Record<string, GradeMap> = {
  'cold iron': {
    'low-grade': { level: 2, base: 40, perBulk: 4 },
    'standard-grade': { level: 10, base: 880, perBulk: 88 },
    'high-grade': { level: 16, base: 9_000, perBulk: 900 },
  },
  silver: {
    'low-grade': { level: 2, base: 40, perBulk: 4 },
    'standard-grade': { level: 10, base: 880, perBulk: 88 },
    'high-grade': { level: 16, base: 9_000, perBulk: 900 },
  },
  adamantine: {
    'standard-grade': { level: 11, base: 1_400, perBulk: 140 },
    'high-grade': { level: 17, base: 13_500, perBulk: 1_350 },
  },
  dawnsilver: {
    'standard-grade': { level: 11, base: 1_400, perBulk: 140 },
    'high-grade': { level: 17, base: 13_500, perBulk: 1_350 },
  },
  duskwood: {
    'standard-grade': { level: 11, base: 1_400, perBulk: 140 },
    'high-grade': { level: 17, base: 13_500, perBulk: 1_350 },
  },
  inubrix: {
    'standard-grade': { level: 11, base: 1_400, perBulk: 140 },
    'high-grade': { level: 17, base: 13_500, perBulk: 1_350 },
  },
  siccatite: {
    'standard-grade': { level: 11, base: 1_400, perBulk: 140 },
    'high-grade': { level: 17, base: 15_000, perBulk: 1_500 },
  },
  noqual: {
    'standard-grade': { level: 12, base: 1_600, perBulk: 160 },
    'high-grade': { level: 18, base: 24_000, perBulk: 2_400 },
  },
  'sovereign steel': {
    'standard-grade': { level: 12, base: 1_600, perBulk: 160 },
    'high-grade': { level: 19, base: 32_000, perBulk: 3_200 },
  },
  djezet: {
    'standard-grade': { level: 12, base: 1_800, perBulk: 180 },
    'high-grade': { level: 18, base: 22_000, perBulk: 2_200 },
  },
  abysium: {
    'standard-grade': { level: 12, base: 2_000, perBulk: 200 },
    'high-grade': { level: 18, base: 24_000, perBulk: 2_400 },
  },
  peachwood: {
    'standard-grade': { level: 12, base: 2_000, perBulk: 200 },
    'high-grade': { level: 18, base: 19_000, perBulk: 1_900 },
  },
  orichalcum: {
    'high-grade': { level: 18, base: 22_500, perBulk: 2_250 },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a material string like "Cold Iron (Low-Grade)" into name and grade. */
export function parseMaterial(material: string): { name: string; grade: string } | null {
  const m = /^(.+?)\s*\(([^)]+)\)\s*$/.exec(material.trim());
  if (!m) return null;
  return { name: m[1].toLowerCase().trim(), grade: m[2].toLowerCase().trim() };
}

/** Convert a PF2e Bulk string to a numeric value for material-price calculation. */
export function bulkToNumber(bulk: string | undefined): number {
  if (!bulk) return 0;
  const b = bulk.trim().toLowerCase();
  if (b === 'l' || b === '—' || b === '-' || b === '') return 0;
  const n = parseFloat(b);
  return isNaN(n) ? 0 : n;
}

/** Parse a price string such as "3 gp", "935 gp", "1,065 gp" into gold pieces. */
export function parsePriceToGp(priceRaw: string): number {
  let total = 0;
  const normalised = priceRaw.replace(/,/g, '');
  const parts = normalised.match(/([\d.]+)\s*(pp|gp|sp|cp)/gi) ?? [];
  for (const part of parts) {
    const m = /([\d.]+)\s*(pp|gp|sp|cp)/i.exec(part);
    if (!m) continue;
    const value = parseFloat(m[1]);
    const unit = m[2].toLowerCase();
    if (unit === 'pp') total += value * 10;
    else if (unit === 'gp') total += value;
    else if (unit === 'sp') total += value / 10;
    else if (unit === 'cp') total += value / 100;
  }
  return total;
}

/** Format a gold-piece total as a human-readable price string. */
export function formatGpPrice(totalGp: number): string {
  if (totalGp <= 0) return '';
  const rounded = Math.round(totalGp * 100) / 100;
  if (rounded < 0.1) return `${Math.round(rounded * 100)} cp`;
  if (rounded < 1) return `${Math.round(rounded * 10)} sp`;
  return Math.round(rounded).toLocaleString('en-US') + ' gp';
}

/**
 * Return the effective item level implied by a weapon's fundamental runes and
 * optional precious material.  Returns undefined when neither is present (a
 * plain, unenchanted, non-material weapon) so that AoN can supply the base
 * weapon level instead.
 */
export function computeEffectiveItemLevel(
  fundamentalRunes: string[],
  material?: string | null,
): number | undefined {
  let max: number | undefined;

  for (const rune of fundamentalRunes) {
    const entry = WEAPON_RUNE_PRICES[rune.toLowerCase()];
    if (entry) max = max === undefined ? entry.level : Math.max(max, entry.level);
  }

  if (material) {
    const parsed = parseMaterial(material);
    if (parsed) {
      const entry = WEAPON_MATERIAL_PRICES[parsed.name]?.[parsed.grade];
      if (entry) max = max === undefined ? entry.level : Math.max(max, entry.level);
    }
  }

  return max;
}

/** Compute the total price in gp contributed by fundamental weapon runes. */
export function computeRunePricesGp(fundamentalRunes: string[]): number {
  let total = 0;
  for (const rune of fundamentalRunes) {
    const entry = WEAPON_RUNE_PRICES[rune.toLowerCase()];
    if (entry) total += entry.gp;
  }
  return total;
}

/**
 * Compute the precious-material surcharge in gp.
 * Uses the base price + (per-Bulk rate × weapon Bulk).
 * Light weapons (Bulk L) and ammunition both use 0 as the Bulk multiplier.
 */
export function computeMaterialPriceGp(material: string, bulkStr: string | undefined): number {
  const parsed = parseMaterial(material);
  if (!parsed) return 0;
  const entry = WEAPON_MATERIAL_PRICES[parsed.name]?.[parsed.grade];
  if (!entry) return 0;
  return entry.base + entry.perBulk * bulkToNumber(bulkStr);
}
