import { describe, expect, it } from 'vitest';
import type { CardModel } from '../model/cards';
import { splitOverflowCards } from './generateDeck';

// Minimal card factory
function makeCard(overrides: Partial<CardModel['rules']> = {}): CardModel {
  return {
    id: 'test-card',
    stableKey: 'test:card',
    title: 'Test Card',
    category: 'spell',
    source: { system: 'generated' },
    rules: {
      traits: [],
      summary: 'Short summary.',
      ...overrides,
    },
    writableFields: [],
    print: { include: true, priority: 10, size: 'standard' },
    userEdits: { edited: false },
  };
}

const LONG_TEXT = 'A'.repeat(900);
const MEDIUM_TEXT = 'A'.repeat(600);
const SHORT_TEXT = 'A'.repeat(200);

describe('splitOverflowCards – no empty card cascade', () => {
  it('does not split a short card', () => {
    const card = makeCard({ summary: SHORT_TEXT });
    expect(splitOverflowCards([card])).toHaveLength(1);
  });

  it('splits a long plain summary into two cards', () => {
    // Needs sentence boundary + total > 800 chars
    const summary = 'Word '.repeat(100) + '. ' + 'More '.repeat(100) + '.';
    const card = makeCard({ summary });
    const result = splitOverflowCards([card]);
    expect(result.length).toBe(2);
    expect(result[1].continuationOf).toBe(card.id);
    expect(result[0].rules.summary.length).toBeLessThan(summary.length);
    expect(result[1].rules.summary.length).toBeGreaterThan(0);
  });

  it('does not produce empty back cards for a plain summary split', () => {
    const summary = 'Word '.repeat(100) + '. ' + 'More '.repeat(100) + '.';
    const card = makeCard({ summary });
    const result = splitOverflowCards([card]);
    for (const c of result) {
      expect(c.rules.summary.trim().length).toBeGreaterThan(0);
    }
  });

  it('splits summary + extraSections into front (summary) and back (extraSections)', () => {
    const card = makeCard({
      summary: MEDIUM_TEXT,
      extraSections: [{ heading: 'Heightened', body: LONG_TEXT }],
    });
    const result = splitOverflowCards([card]);
    expect(result.length).toBe(2);
    const front = result[0];
    const back = result[1];
    expect(front.rules.extraSections).toBeUndefined();
    expect(back.rules.extraSections).toBeDefined();
    expect(back.continuationOf).toBe(card.id);
  });

  it('does NOT produce empty intermediate cards when back has empty summary + long extraSections', () => {
    // This is the Evolution Surge bug: summary fits on front (600 chars), but
    // the resulting back card has summary="" and extraSections ~1000 chars.
    // Without the guard, this cascades to 4 empty cards.
    const card = makeCard({
      summary: MEDIUM_TEXT,
      extraSections: [{ heading: 'Heightened (3rd)', body: LONG_TEXT }],
    });
    const result = splitOverflowCards([card]);
    // Should be exactly 2 cards: front with summary, back with extraSections
    expect(result.length).toBe(2);
    for (const c of result) {
      const hasContent =
        c.rules.summary.trim().length > 0 ||
        (c.rules.extraSections ?? []).some((s) => s.body.trim().length > 0);
      expect(hasContent).toBe(true);
    }
  });

  it('does NOT cascade when a continuation card has only empty summary + long extraSections', () => {
    // Directly test that a back card with empty summary + long extraSections
    // is left unchanged (no further splitting).
    const backCard: CardModel = {
      ...makeCard({
        summary: '',
        extraSections: [{ heading: 'Heightened', body: LONG_TEXT }],
      }),
      id: 'test-card-back',
      stableKey: 'test:card-back',
      continuationOf: 'test-card',
      writableFields: [],
    };
    const result = splitOverflowCards([backCard]);
    expect(result).toHaveLength(1);
    expect(result[0].rules.extraSections).toBeDefined();
  });

  it('splits summary + outcomes onto two cards', () => {
    const card = makeCard({
      summary: MEDIUM_TEXT,
      criticalSuccess: LONG_TEXT,
      success: SHORT_TEXT,
    });
    const result = splitOverflowCards([card]);
    expect(result.length).toBe(2);
    expect(result[0].rules.criticalSuccess).toBeUndefined();
    expect(result[1].rules.criticalSuccess).toBe(LONG_TEXT);
  });

  it('does NOT produce empty front when outcomes card already has empty summary', () => {
    const card = makeCard({
      summary: '',
      criticalSuccess: LONG_TEXT,
      success: SHORT_TEXT,
    });
    const result = splitOverflowCards([card]);
    // summary="" means front would be empty — should not split
    expect(result).toHaveLength(1);
  });

  it('is idempotent — running twice produces same result', () => {
    const card = makeCard({
      summary: MEDIUM_TEXT,
      extraSections: [{ heading: 'Heightened', body: LONG_TEXT }],
    });
    const once = splitOverflowCards([card]);
    const twice = splitOverflowCards(once);
    expect(twice.length).toBe(once.length);
  });
});
