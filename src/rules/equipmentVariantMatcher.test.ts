import { describe, expect, it } from 'vitest';
import {
  buildEquipmentDescription,
  filterEquipmentDescription,
  matchEquipmentVariant,
  parseEquipmentVariants,
  splitItemName,
} from './equipmentVariantMatcher';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/**
 * Represents data.description as produced by parseFullRulesHtml for Healing Potion.
 *
 * In the real AoN Elasticsearch text field, variant level info lives in a
 * <title right="Item N"> HTML attribute that is stripped during parsing.
 * What remains is: shared activation text, then per-variant sections in the form:
 *
 *   "Name (Variant) Source <Book> pg. N Price X gp --- Variant text"
 *
 * This fixture is constructed from the live AoN response for
 * 'Healing Potion (Minor)' / 'Healing Potion (Lesser)' (both return identical text).
 */
const HEALING_POTION_TEXT =
  'A healing potion is a vial of a ruby-red liquid that imparts a tingling sensation as the ' +
  "drinker's wounds heal rapidly. When you drink a healing potion , you regain the listed " +
  'number of Hit Points.  ' +
  'Healing Potion (Minor) Source GM Core pg. 259, Core Rulebook pg. 563 Price 4 gp --- ' +
  'The potion restores 1d8 Hit Points.  ' +
  'Healing Potion (Lesser) Source GM Core pg. 259, Core Rulebook pg. 563 Price 12 gp --- ' +
  'The potion restores 2d8+5 Hit Points.  ' +
  'Healing Potion (Moderate) Source GM Core pg. 259, Core Rulebook pg. 563 Price 50 gp --- ' +
  'The potion restores 3d8+10 Hit Points.  ' +
  'Healing Potion (Greater) Source GM Core pg. 259, Core Rulebook pg. 563 Price 400 gp --- ' +
  'The potion restores 6d8+20 Hit Points.  ' +
  'Healing Potion (Major) Source GM Core pg. 259, Core Rulebook pg. 563 Price 5,000 gp --- ' +
  'The potion restores 8d8+30 Hit Points.';

/** Single-variant version: only the Minor entry appears on the page. */
const HEALING_POTION_SINGLE_TEXT =
  'Healing Potion (Minor) Source GM Core pg. 259 Price 4 gp --- ' +
  'The potion restores 1d8 Hit Points.';

// ---------------------------------------------------------------------------
// splitItemName
// ---------------------------------------------------------------------------

describe('splitItemName', () => {
  it('splits a simple variant in parentheses', () => {
    expect(splitItemName('Healing Potion (Minor)')).toEqual({
      baseName: 'Healing Potion',
      variantName: 'Minor',
    });
  });

  it('returns baseName only when there are no parentheses', () => {
    expect(splitItemName('Shadow Signet')).toEqual({ baseName: 'Shadow Signet' });
  });

  it('handles multi-word variant names', () => {
    expect(splitItemName('Ring of Wizardry (Type I)')).toEqual({
      baseName: 'Ring of Wizardry',
      variantName: 'Type I',
    });
  });

  it('handles rank-style variant names', () => {
    expect(splitItemName('Wand of Shardstorm (3rd-Rank Spell)')).toEqual({
      baseName: 'Wand of Shardstorm',
      variantName: '3rd-Rank Spell',
    });
  });

  it('handles Greater / Lesser grade suffixes', () => {
    expect(splitItemName('Staff of Fire (Greater)')).toEqual({
      baseName: 'Staff of Fire',
      variantName: 'Greater',
    });
  });

  it('trims surrounding whitespace', () => {
    expect(splitItemName('  Healing Potion (Minor)  ')).toEqual({
      baseName: 'Healing Potion',
      variantName: 'Minor',
    });
  });
});

// ---------------------------------------------------------------------------
// parseEquipmentVariants
// ---------------------------------------------------------------------------

describe('parseEquipmentVariants', () => {
  it('detects all five Healing Potion variants', () => {
    const { variants } = parseEquipmentVariants(HEALING_POTION_TEXT, 'Healing Potion');
    expect(variants).toHaveLength(5);
    expect(variants.map((v) => v.name)).toEqual([
      'Healing Potion (Minor)',
      'Healing Potion (Lesser)',
      'Healing Potion (Moderate)',
      'Healing Potion (Greater)',
      'Healing Potion (Major)',
    ]);
  });

  it('level is undefined (was in a stripped HTML attribute, not recoverable)', () => {
    const { variants } = parseEquipmentVariants(HEALING_POTION_TEXT, 'Healing Potion');
    expect(variants.every((v) => v.level === undefined)).toBe(true);
  });

  it('extracts variant-specific text for each entry', () => {
    const { variants } = parseEquipmentVariants(HEALING_POTION_TEXT, 'Healing Potion');
    expect(variants[0].text).toContain('1d8 Hit Points');
    expect(variants[1].text).toContain('2d8+5 Hit Points');
    expect(variants[2].text).toContain('3d8+10 Hit Points');
    expect(variants[3].text).toContain('6d8+20 Hit Points');
    expect(variants[4].text).toContain('8d8+30 Hit Points');
  });

  it('does not bleed sibling text into a variant', () => {
    const { variants } = parseEquipmentVariants(HEALING_POTION_TEXT, 'Healing Potion');
    expect(variants[0].text).not.toContain('2d8+5');
    expect(variants[1].text).not.toContain('1d8 Hit Points');
  });

  it('extracts shared text before the first variant header', () => {
    const { sharedText } = parseEquipmentVariants(HEALING_POTION_TEXT, 'Healing Potion');
    expect(sharedText).toContain('you regain the listed number of Hit Points');
    // Must not include source metadata or variant-specific content
    expect(sharedText).not.toContain('Source');
    expect(sharedText).not.toContain('1d8 Hit Points');
  });

  it('returns no variants for a description with no item headers', () => {
    const text = 'This shadow signet increases your ability to hide in shadows.';
    const { variants, sharedText } = parseEquipmentVariants(text, 'Shadow Signet');
    expect(variants).toHaveLength(0);
    expect(sharedText).toContain('hide in shadows');
  });

  it('extracts a single variant from a single-variant page (header stripped from body)', () => {
    const { sharedText, variants } = parseEquipmentVariants(
      HEALING_POTION_SINGLE_TEXT,
      'Healing Potion',
    );
    expect(variants).toHaveLength(1);
    expect(variants[0].name).toBe('Healing Potion (Minor)');
    expect(variants[0].text).toBe('The potion restores 1d8 Hit Points.');
    // Source/price metadata and header must not appear in body text
    expect(variants[0].text).not.toContain('Source');
    expect(variants[0].text).not.toContain('Price');
    expect(sharedText).toBe('');
  });

  it('strips bold markers (**) before parsing', () => {
    // Bold markers on the variant name should not prevent matching.
    const textWithBold =
      '**Healing Potion (Minor)** Source GM Core pg. 259 Price 4 gp --- ' +
      'The potion restores 1d8 Hit Points.  ' +
      '**Healing Potion (Lesser)** Source GM Core pg. 259 Price 12 gp --- ' +
      'The potion restores 2d8+5 Hit Points.';
    const { variants } = parseEquipmentVariants(textWithBold, 'Healing Potion');
    expect(variants).toHaveLength(2);
    expect(variants[0].name).toBe('Healing Potion (Minor)');
    expect(variants[0].text).toBe('The potion restores 1d8 Hit Points.');
  });

  it('strips base-tier citation before first variant header', () => {
    // Items like "Bands of Force" embed "Bands of Force Source ... Price 500 gp" in
    // the shared section (no '---' body separator for the base tier). This should be
    // stripped so it does not bleed into sharedText.
    const text =
      'Decorated with gemstones, these bands grant +1 to AC. Activate—Return Force Reaction. ' +
      'Bands of Force Source GM Core pg. 286 Price 500 gp  ' +
      'Bands of Force (Greater) Source GM Core pg. 286 Price 4,500 gp --- ' +
      'The item bonus to AC and saves is +2.';
    const { sharedText, variants } = parseEquipmentVariants(text, 'Bands of Force');
    expect(variants).toHaveLength(1);
    expect(variants[0].name).toBe('Bands of Force (Greater)');
    // sharedText must not contain the base-tier citation or item name artifact
    expect(sharedText).not.toContain('Source');
    expect(sharedText).not.toContain('Price');
    expect(sharedText).toContain('Activate—Return Force Reaction');
  });

  it('populates variantName correctly', () => {
    const { variants } = parseEquipmentVariants(HEALING_POTION_TEXT, 'Healing Potion');
    expect(variants.map((v) => v.variantName)).toEqual([
      'Minor',
      'Lesser',
      'Moderate',
      'Greater',
      'Major',
    ]);
  });

  it('extracts price from the source metadata section', () => {
    const { variants } = parseEquipmentVariants(HEALING_POTION_TEXT, 'Healing Potion');
    expect(variants[0].price).toBe('4 gp');
    expect(variants[1].price).toBe('12 gp');
    expect(variants[2].price).toBe('50 gp');
    expect(variants[4].price).toBe('5,000 gp');
  });

  it('leaves price undefined when no Price field is present', () => {
    const text =
      'X (A) Source Some Book pg. 1 --- A text.  ' + 'X (B) Source Some Book pg. 1 --- B text.';
    const { variants } = parseEquipmentVariants(text, 'X');
    expect(variants[0].price).toBeUndefined();
    expect(variants[1].price).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// matchEquipmentVariant
// ---------------------------------------------------------------------------

describe('matchEquipmentVariant', () => {
  const { variants } = parseEquipmentVariants(HEALING_POTION_TEXT, 'Healing Potion');

  it('returns null for an empty variants list', () => {
    expect(matchEquipmentVariant('Healing Potion (Minor)', undefined, undefined, [])).toBeNull();
  });

  it('matches exact name with confidence "exact"', () => {
    const result = matchEquipmentVariant('Healing Potion (Minor)', undefined, undefined, variants);
    expect(result?.variant.name).toBe('Healing Potion (Minor)');
    expect(result?.confidence).toBe('exact');
  });

  it('exact match is case-insensitive', () => {
    const result = matchEquipmentVariant('healing potion (minor)', undefined, undefined, variants);
    expect(result?.variant.name).toBe('Healing Potion (Minor)');
    expect(result?.confidence).toBe('exact');
  });

  it('matches each sibling variant independently', () => {
    const cases: [string, string][] = [
      ['Healing Potion (Lesser)', 'Healing Potion (Lesser)'],
      ['Healing Potion (Moderate)', 'Healing Potion (Moderate)'],
      ['Healing Potion (Greater)', 'Healing Potion (Greater)'],
      ['Healing Potion (Major)', 'Healing Potion (Major)'],
    ];
    for (const [input, expected] of cases) {
      const result = matchEquipmentVariant(input, undefined, undefined, variants);
      expect(result?.variant.name).toBe(expected);
    }
  });

  it('falls back to level match when name does not match (using variants with levels set)', () => {
    // Level is not parsed from the AoN description (was in a stripped HTML attribute),
    // but callers can provide variant objects with levels from other sources.
    const variantsWithLevels = [
      {
        name: 'Healing Potion (Minor)',
        baseName: 'Healing Potion',
        variantName: 'Minor',
        level: 1,
        text: 'restores 1d8.',
      },
      {
        name: 'Healing Potion (Moderate)',
        baseName: 'Healing Potion',
        variantName: 'Moderate',
        level: 6,
        text: 'restores 3d8+10.',
      },
    ];
    const result = matchEquipmentVariant('Healing Potion', 6, undefined, variantsWithLevels);
    expect(result?.variant.name).toBe('Healing Potion (Moderate)');
    expect(result?.confidence).toBe('level');
  });

  it('does not level-match when multiple variants share the same level', () => {
    const dupeVariants = [
      { name: 'X (A)', baseName: 'X', variantName: 'A', level: 1, text: 'A text' },
      { name: 'X (B)', baseName: 'X', variantName: 'B', level: 1, text: 'B text' },
    ];
    const result = matchEquipmentVariant('X', 1, undefined, dupeVariants);
    expect(result).toBeNull();
  });

  it('returns null when no strategy matches', () => {
    const result = matchEquipmentVariant(
      'Healing Potion (Infinite)',
      undefined,
      undefined,
      variants,
    );
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// filterEquipmentDescription
// ---------------------------------------------------------------------------

describe('filterEquipmentDescription', () => {
  it('selects only the Minor variant for Healing Potion (Minor)', () => {
    const result = filterEquipmentDescription(
      HEALING_POTION_TEXT,
      'Healing Potion (Minor)',
      1,
      undefined,
      'https://2e.aonprd.com/Equipment.aspx?ID=84',
    );

    expect(result.confidence).toBe('exact');
    expect(result.matchedVariant?.name).toBe('Healing Potion (Minor)');
    expect(result.matchedVariant?.text).toContain('1d8 Hit Points');
    expect(result.matchedVariant?.text).not.toContain('2d8+5');
    expect(result.matchedVariant?.text).not.toContain('3d8+10');
    expect(result.sourceUrl).toBe('https://2e.aonprd.com/Equipment.aspx?ID=84');
  });

  it('selects only the Lesser variant for Healing Potion (Lesser)', () => {
    const result = filterEquipmentDescription(
      HEALING_POTION_TEXT,
      'Healing Potion (Lesser)',
      3,
      undefined,
      undefined,
    );
    expect(result.matchedVariant?.text).toContain('2d8+5 Hit Points');
    expect(result.matchedVariant?.text).not.toContain('1d8 Hit Points');
  });

  it('preserves shared parent text in matched result', () => {
    const result = filterEquipmentDescription(
      HEALING_POTION_TEXT,
      'Healing Potion (Minor)',
      1,
      undefined,
      undefined,
    );
    expect(result.sharedText).toContain('you regain the listed number of Hit Points');
  });

  it('falls back gracefully when variant cannot be matched', () => {
    const result = filterEquipmentDescription(
      HEALING_POTION_TEXT,
      'Healing Potion',
      undefined,
      undefined,
      undefined,
    );
    expect(result.confidence).toBe('fallback');
    expect(result.matchedVariant).toBeUndefined();
    expect(result.sharedText).toContain('you regain the listed number of Hit Points');
  });

  it('returns full description unchanged for a non-variant item', () => {
    const desc = 'This signet ring bears the symbol of a crescent moon.';
    const result = filterEquipmentDescription(
      desc,
      'Shadow Signet',
      undefined,
      undefined,
      undefined,
    );
    expect(result.confidence).toBe('exact');
    expect(result.sharedText).toBe(desc);
    expect(result.matchedVariant).toBeUndefined();
  });

  it('extracts price from a non-variant description so it survives stripSourceMetadata', () => {
    const desc =
      'This humble sash can be worn around the waist or across the chest. ' +
      'Shadow Signet Source Agent Optics pg. 42 Price 475 gp Usage worn (as signet ring) ' +
      'Bulk —';
    const result = filterEquipmentDescription(
      desc,
      'Shadow Signet',
      undefined,
      undefined,
      undefined,
    );
    expect(result.extractedPrice).toBe('475 gp');
  });

  it('leaves extractedPrice undefined when no price is present in the description', () => {
    const desc = 'This signet ring bears the symbol of a crescent moon.';
    const result = filterEquipmentDescription(
      desc,
      'Shadow Signet',
      undefined,
      undefined,
      undefined,
    );
    expect(result.extractedPrice).toBeUndefined();
  });

  it('strips the variant header when AoN returns a single-variant page', () => {
    // Simulates AoN returning the Minor entry on its own page (no siblings).
    const result = filterEquipmentDescription(
      HEALING_POTION_SINGLE_TEXT,
      'Healing Potion (Minor)',
      1,
      undefined,
      undefined,
    );
    expect(result.confidence).toBe('exact');
    expect(result.matchedVariant?.name).toBe('Healing Potion (Minor)');
    const built = buildEquipmentDescription(result);
    // Source metadata and header must not appear in the card text
    expect(built).not.toContain('Source');
    expect(built).not.toContain('Price');
    expect(built).toContain('1d8 Hit Points');
  });

  it('selects Lesser variant from the real AoN description format without sibling bleed', () => {
    // Core acceptance test: character has Healing Potion (Lesser).
    // AoN returns the full page (all 5 variants in one text block).
    // The card should contain ONLY the shared text + the Lesser body.
    const result = filterEquipmentDescription(
      HEALING_POTION_TEXT,
      'Healing Potion (Lesser)',
      3,
      undefined,
      undefined,
    );
    expect(result.confidence).toBe('exact');
    const desc = buildEquipmentDescription(result);
    expect(desc).toContain('you regain the listed number of Hit Points');
    expect(desc).toContain('2d8+5 Hit Points');
    expect(desc).not.toContain('Healing Potion (Minor)');
    expect(desc).not.toContain('Healing Potion (Moderate)');
    expect(desc).not.toContain('1d8 Hit Points');
    expect(desc).not.toContain('3d8+10');
    expect(desc).not.toContain('Source');
    expect(desc).not.toContain('Price');
  });
});

// ---------------------------------------------------------------------------
// buildEquipmentDescription
// ---------------------------------------------------------------------------

describe('buildEquipmentDescription', () => {
  it('combines shared text and variant text with a blank line separator', () => {
    const result = filterEquipmentDescription(
      HEALING_POTION_TEXT,
      'Healing Potion (Minor)',
      1,
      undefined,
      undefined,
    );
    const desc = buildEquipmentDescription(result);
    expect(desc).toContain('you regain the listed number of Hit Points');
    expect(desc).toContain('1d8 Hit Points');
    expect(desc).not.toContain('2d8+5');
    expect(desc).not.toContain('3d8+10');
    expect(desc).not.toContain('6d8+20');
    expect(desc).not.toContain('8d8+30');
  });

  it('returns only shared text on fallback (no variants in output)', () => {
    const result = filterEquipmentDescription(
      HEALING_POTION_TEXT,
      'Healing Potion',
      undefined,
      undefined,
      undefined,
    );
    const desc = buildEquipmentDescription(result);
    expect(desc).toBe(result.sharedText);
    expect(desc).not.toContain('1d8 Hit Points');
  });

  it('returns the full description for a non-variant item', () => {
    const desc = 'This signet ring bears the symbol of a crescent moon.';
    const result = filterEquipmentDescription(
      desc,
      'Shadow Signet',
      undefined,
      undefined,
      undefined,
    );
    expect(buildEquipmentDescription(result)).toBe(desc);
  });
});
