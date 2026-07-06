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
  /** Price captured from the description text before stripSourceMetadata removes it. */
  extractedPrice?: string;
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
 * Looks for repeated "ItemName (Variant) Source ..." headers within the text,
 * where ItemName starts with `baseName`. In AoN descriptions the level info
 * (e.g. "Item 1") lives in an HTML attribute that is stripped during parsing;
 * variant headers are therefore identified by the variant-in-parens followed by
 * an AoN source citation ("Source <BookName> pg. N").
 *
 * Returns `{ sharedText: fullDescription, variants: [] }` when no variant
 * headers are detected — i.e. a single-item page with no sibling sections.
 */
export function parseEquipmentVariants(
  description: string,
  baseName: string,
): { sharedText: string; variants: EquipmentVariant[] } {
  // Strip Markdown bold markers added by stripHtml, collapse excessive blank lines.
  let plain = description.replace(/\*\*/g, '').replace(/\n{3,}/g, '\n\n');

  const escapedBase = escapeRegex(baseName);

  // Some multi-tier items embed a base-tier citation in the shared text section,
  // e.g. "Bands of Force Source GM Core pg. 286 Price 500 gp" (no variant qualifier,
  // no '---' body separator). Strip these so they don't bleed into sharedText.
  // The pattern stops at the optional "Price X gp" to avoid eating the next variant header.
  const baseTierCitationRe = new RegExp(
    `\\s+${escapedBase}\\s+Source\\s+[A-Z][\\w ',]+pg\\.\\s*\\d+` +
      `(?:\\s+Price\\s+[\\d,]+\\s*(?:gp|sp|cp)(?:\\s*,\\s*\\d+\\s*(?:sp|cp))*)?`,
    'gi',
  );
  plain = plain.replace(baseTierCitationRe, '').trim();

  // Variant headers in AoN descriptions appear as:
  //   "BaseName (Variant) Source <BookName> pg. N ..."
  // The level ("Item N") was in the HTML 'right' attribute and is lost after parsing.
  // We use the Source citation as the reliable delimiter.
  const variantHeaderRe = new RegExp(`(${escapedBase}\\s*\\([^)]+\\))\\s+Source\\s+[A-Z]`, 'gi');

  const headerMatches: Array<{ index: number; name: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = variantHeaderRe.exec(plain)) !== null) {
    headerMatches.push({ index: m.index, name: m[1].trim() });
  }

  // No variant headers — description is for a single item, no filtering needed.
  if (headerMatches.length === 0) {
    return { sharedText: plain.trim(), variants: [] };
  }

  // Shared text: everything before the first variant header.
  const sharedText = plain.slice(0, headerMatches[0].index).trim();

  const variants: EquipmentVariant[] = headerMatches.map((header, i) => {
    const blockEnd = i + 1 < headerMatches.length ? headerMatches[i + 1].index : plain.length;
    const block = plain.slice(header.index, blockEnd);

    // The ' --- ' separator divides the variant's source/price metadata from its body text.
    const sepIdx = block.indexOf(' --- ');
    const metaSection = sepIdx > -1 ? block.slice(0, sepIdx) : block;
    const bodyText = sepIdx > -1 ? block.slice(sepIdx + 5).trim() : '';

    // Extract price from the metadata section (e.g. "Price 4 gp").
    const priceMatch = /Price\s+([\d,]+\s*(?:gp|sp|cp)(?:\s*,\s*\d+\s*(?:sp|cp))*)/i.exec(
      metaSection,
    );

    const { baseName: bn, variantName } = splitItemName(header.name);
    return {
      name: header.name,
      baseName: bn,
      variantName,
      // Level was in the HTML 'right' attribute; not recoverable from plain text.
      level: undefined,
      price: priceMatch?.[1]?.trim(),
      text: bodyText,
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
  /** Reserved: character's own item price for matching. Not yet imported from Pathbuilder. */
  _itemPrice: string | undefined,
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
  /** Reserved: character's own item price for matching. Not yet imported from Pathbuilder. */
  _itemPrice: string | undefined,
  sourceUrl: string | undefined,
): EnrichedEquipmentResult {
  const { baseName } = splitItemName(itemName);
  const { sharedText, variants } = parseEquipmentVariants(description, baseName);

  if (variants.length === 0) {
    const stripped = description.replace(/\*\*/g, '');
    const priceMatch = /\bPrice\s+([\d,]+\s*(?:gp|sp|cp)(?:\s*,\s*\d+\s*(?:sp|cp))*)/i.exec(
      stripped,
    );
    return {
      parentName: baseName,
      sharedText: stripped.trim(),
      extractedPrice: priceMatch?.[1]?.trim(),
      confidence: 'exact',
      sourceUrl,
    };
  }

  const match = matchEquipmentVariant(itemName, itemLevel, _itemPrice, variants);

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
