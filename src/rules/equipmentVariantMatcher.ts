/**
 * Equipment variant matching.
 *
 * Some AoN item pages contain a parent item plus multiple variant entries under
 * the same page/link. This module parses those variant sections from enriched
 * description text and selects only the variant that matches the character's item.
 */

export interface EquipmentVariant {
  name: string;
  baseName: string;
  variantName?: string;
  level?: number;
  price?: string;
  text: string;
}

export interface EnrichedEquipmentResult {
  parentName: string;
  sharedText?: string;
  matchedVariant?: EquipmentVariant;
  confidence: 'exact' | 'normalized' | 'level' | 'price' | 'fallback';
  sourceUrl?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Split a full item name into a base name and optional variant qualifier.
 *
 * Examples:
 *   "Healing Potion (Minor)"         → { baseName: "Healing Potion",     variantName: "Minor" }
 *   "Ring of Wizardry (Type I)"      → { baseName: "Ring of Wizardry",   variantName: "Type I" }
 *   "Wand of Shardstorm (3rd-Rank Spell)" → { baseName: "Wand of Shardstorm", variantName: "3rd-Rank Spell" }
 *   "Shadow Signet"                  → { baseName: "Shadow Signet" }
 */
export function splitItemName(fullName: string): { baseName: string; variantName?: string } {
  const match = /^(.+?)\s*\(([^)]+)\)\s*$/.exec(fullName);
  if (match) {
    return { baseName: match[1].trim(), variantName: match[2].trim() };
  }
  return { baseName: fullName.trim() };
}

/**
 * Parse variant sections from an AoN item description.
 *
 * Looks for repeated "ItemName (Variant) Item N" headers within the text,
 * where ItemName starts with `baseName`. Splits those headers into separate
 * variant entries.
 *
 * Returns `{ sharedText: fullDescription, variants: [] }` when fewer than two
 * variant headers are detected — i.e. the description is a single item with no
 * siblings to filter out.
 */
export function parseEquipmentVariants(
  description: string,
  baseName: string,
): { sharedText: string; variants: EquipmentVariant[] } {
  // Normalise the text: strip Markdown bold markers added by stripHtml and
  // collapse excessive blank lines.
  const plain = description.replace(/\*\*/g, '').replace(/\n{3,}/g, '\n\n');

  const escapedBase = escapeRegex(baseName);

  // Matches both the plain parent header ("Healing Potion Item 1+") and
  // variant headers ("Healing Potion (Minor) Item 1").
  const headerRe = new RegExp(`(${escapedBase}(?:\\s*\\([^)]+\\))?)\\s*Item\\s+(\\d+)\\+?`, 'gi');

  const allMatches: Array<{
    index: number;
    name: string;
    level: number;
    isParent: boolean;
  }> = [];

  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(plain)) !== null) {
    const name = m[1].trim();
    // A header without parentheses is the parent/range entry, not a specific variant.
    const isParent = !name.includes('(');
    allMatches.push({ index: m.index, name, level: parseInt(m[2], 10), isParent });
  }

  const variantMatches = allMatches.filter((match) => !match.isParent);

  // Need at least two variant headers to have something worth splitting.
  if (variantMatches.length < 2) {
    return { sharedText: plain.trim(), variants: [] };
  }

  // Shared text = content between end of parent header (if any) and the first
  // variant header.  When there is no parent header, it's everything before
  // the first variant.
  const parentMatch = allMatches.find((match) => match.isParent);
  let sharedStart = 0;
  if (parentMatch) {
    const newlineAfterParent = plain.indexOf('\n', parentMatch.index);
    sharedStart = newlineAfterParent > -1 ? newlineAfterParent + 1 : plain.length;
  }
  const sharedText = plain.slice(sharedStart, variantMatches[0].index).trim();

  const variants: EquipmentVariant[] = variantMatches.map((match, i) => {
    const start = match.index;
    const end = i + 1 < variantMatches.length ? variantMatches[i + 1].index : plain.length;
    const block = plain.slice(start, end).trim();
    // First line is the header; the body follows.
    const firstNewline = block.indexOf('\n');
    const text = firstNewline > -1 ? block.slice(firstNewline + 1).trim() : '';

    const { baseName: bn, variantName } = splitItemName(match.name);
    return {
      name: match.name,
      baseName: bn,
      variantName,
      level: match.level,
      text,
    };
  });

  return { sharedText, variants };
}

/**
 * Select the best matching variant for a character's item.
 *
 * Matching priority:
 *  1. Exact full name match (case-insensitive)
 *  2. Normalised name match (ignore punctuation / whitespace differences)
 *  3. Variant-name match (e.g. "Minor" inside "Healing Potion (Minor)")
 *  4. Item level match (unique level → unambiguous)
 *  5. Price match — not yet implemented (CharacterEquipment has no price field)
 *
 * Returns `null` when no confident match can be made.
 */
export function matchEquipmentVariant(
  itemName: string,
  itemLevel: number | undefined,
  itemPrice: string | undefined,
  variants: EquipmentVariant[],
): { variant: EquipmentVariant; confidence: EnrichedEquipmentResult['confidence'] } | null {
  if (variants.length === 0) return null;

  // 1. Exact name match
  const exact = variants.find((v) => v.name.toLowerCase() === itemName.toLowerCase());
  if (exact) return { variant: exact, confidence: 'exact' };

  // 2. Normalised name match
  const normItem = normalizeName(itemName);
  const byNorm = variants.find((v) => normalizeName(v.name) === normItem);
  if (byNorm) return { variant: byNorm, confidence: 'normalized' };

  // 3. Variant-qualifier match
  const { variantName: itemVariant } = splitItemName(itemName);
  if (itemVariant) {
    const normVariant = normalizeName(itemVariant);
    const byVariant = variants.find(
      (v) => v.variantName != null && normalizeName(v.variantName) === normVariant,
    );
    if (byVariant) return { variant: byVariant, confidence: 'normalized' };
  }

  // 4. Item level match (only when unambiguous)
  if (itemLevel !== undefined) {
    const byLevel = variants.filter((v) => v.level === itemLevel);
    if (byLevel.length === 1) return { variant: byLevel[0], confidence: 'level' };
  }

  return null;
}

/**
 * Filter an AoN equipment description to the variant that matches the
 * character's item.
 *
 * - When multiple variants are found and a match is made, returns shared parent
 *   text plus the matched variant's text.
 * - When multiple variants are found but none match, returns only the shared
 *   parent text with confidence 'fallback'.
 * - When no variant headers are detected (single-item page), returns the full
 *   description unchanged.
 */
export function filterEquipmentDescription(
  description: string,
  itemName: string,
  itemLevel: number | undefined,
  itemPrice: string | undefined,
  sourceUrl: string | undefined,
): EnrichedEquipmentResult {
  const { baseName } = splitItemName(itemName);
  const { sharedText, variants } = parseEquipmentVariants(description, baseName);

  if (variants.length === 0) {
    return {
      parentName: baseName,
      sharedText: description.replace(/\*\*/g, '').trim(),
      confidence: 'exact',
      sourceUrl,
    };
  }

  const match = matchEquipmentVariant(itemName, itemLevel, itemPrice, variants);

  if (!match) {
    return {
      parentName: baseName,
      sharedText: sharedText || undefined,
      confidence: 'fallback',
      sourceUrl,
    };
  }

  return {
    parentName: baseName,
    sharedText: sharedText || undefined,
    matchedVariant: match.variant,
    confidence: match.confidence,
    sourceUrl,
  };
}

/**
 * Build the final display text for an equipment card from a filtered result.
 * Combines shared parent text and matched variant text, separated by a blank
 * line.
 */
export function buildEquipmentDescription(result: EnrichedEquipmentResult): string {
  const parts: string[] = [];
  if (result.sharedText) parts.push(result.sharedText);
  if (result.matchedVariant?.text) parts.push(result.matchedVariant.text);
  return parts.join('\n\n').trim();
}
