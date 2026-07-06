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
 * Representative AoN text for a multi-variant item (Healing Potion).
 * Mirrors the structure described in issue #17:
 *   - Parent header "Healing Potion Item 1+" (range entry, no variant)
 *   - Shared activation text
 *   - Per-variant headers each followed by their specific text
 */
const HEALING_POTION_TEXT = `Healing Potion Item 1+
When you drink a healing potion, you regain the listed number of Hit Points.

Healing Potion (Minor) Item 1
The potion restores 1d8 Hit Points.

Healing Potion (Lesser) Item 3
The potion restores 2d8+5 Hit Points.

Healing Potion (Moderate) Item 6
The potion restores 3d8+10 Hit Points.

Healing Potion (Greater) Item 12
The potion restores 6d8+20 Hit Points.

Healing Potion (Major) Item 18
The potion restores 8d8+30 Hit Points.`;

/**
 * Same content but with bold markers (**) as produced by stripHtml for
 * items whose AoN page uses <b>/<strong> tags for variant headings.
 */
const HEALING_POTION_TEXT_BOLD = `**Healing Potion** **Item 1+**
When you drink a healing potion, you regain the listed number of Hit Points.

**Healing Potion (Minor)** **Item 1**
The potion restores 1d8 Hit Points.

**Healing Potion (Lesser)** **Item 3**
The potion restores 2d8+5 Hit Points.

**Healing Potion (Moderate)** **Item 6**
The potion restores 3d8+10 Hit Points.`;

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

  it('extracts the correct level for each variant', () => {
    const { variants } = parseEquipmentVariants(HEALING_POTION_TEXT, 'Healing Potion');
    expect(variants.map((v) => v.level)).toEqual([1, 3, 6, 12, 18]);
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

  it('extracts shared text between parent header and first variant', () => {
    const { sharedText } = parseEquipmentVariants(HEALING_POTION_TEXT, 'Healing Potion');
    expect(sharedText).toContain('you regain the listed number of Hit Points');
    // Must not include the parent header line itself
    expect(sharedText).not.toContain('Item 1+');
    // Must not include variant-specific content
    expect(sharedText).not.toContain('1d8 Hit Points');
  });

  it('returns no variants for a single-item description', () => {
    const text = 'This shadow signet increases your ability to hide in shadows.';
    const { variants, sharedText } = parseEquipmentVariants(text, 'Shadow Signet');
    expect(variants).toHaveLength(0);
    expect(sharedText).toContain('hide in shadows');
  });

  it('strips bold markers (**) before parsing', () => {
    const { variants } = parseEquipmentVariants(HEALING_POTION_TEXT_BOLD, 'Healing Potion');
    expect(variants).toHaveLength(3);
    expect(variants[0].name).toBe('Healing Potion (Minor)');
    expect(variants[0].text).toContain('1d8 Hit Points');
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

  it('handles description with no parent header (variants only)', () => {
    const text = `Healing Potion (Minor) Item 1
The potion restores 1d8 Hit Points.

Healing Potion (Lesser) Item 3
The potion restores 2d8+5 Hit Points.`;

    const { sharedText, variants } = parseEquipmentVariants(text, 'Healing Potion');
    expect(variants).toHaveLength(2);
    expect(sharedText).toBe('');
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

  it('falls back to level match when name does not match', () => {
    // Searching the base name only — no exact/normalised match
    const result = matchEquipmentVariant('Healing Potion', 6, undefined, variants);
    expect(result?.variant.name).toBe('Healing Potion (Moderate)');
    expect(result?.confidence).toBe('level');
  });

  it('does not level-match when multiple variants share the same level', () => {
    // Construct a fake scenario with two variants at level 1
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
