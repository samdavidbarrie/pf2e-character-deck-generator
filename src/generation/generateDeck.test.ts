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

describe('splitOverflowCards – [newcard] marker only', () => {
  it('does not split a short card', () => {
    const card = makeCard({ summary: SHORT_TEXT });
    expect(splitOverflowCards([card])).toHaveLength(1);
  });

  it('does not split a long plain summary without [newcard]', () => {
    const summary = 'Word '.repeat(100) + '. ' + 'More '.repeat(100) + '.';
    const card = makeCard({ summary });
    expect(splitOverflowCards([card])).toHaveLength(1);
  });

  it('does not split summary + outcomes without [newcard]', () => {
    const card = makeCard({
      summary: MEDIUM_TEXT,
      criticalSuccess: LONG_TEXT,
      success: SHORT_TEXT,
    });
    expect(splitOverflowCards([card])).toHaveLength(1);
  });

  it('does not split summary + extraSections without [newcard]', () => {
    const card = makeCard({
      summary: MEDIUM_TEXT,
      extraSections: [{ heading: 'Heightened', body: LONG_TEXT }],
    });
    expect(splitOverflowCards([card])).toHaveLength(1);
  });

  it('splits on [newcard] marker', () => {
    const card = makeCard({
      summary: `${MEDIUM_TEXT}\n[newcard]${MEDIUM_TEXT}`,
    });
    const result = splitOverflowCards([card]);
    expect(result).toHaveLength(2);
    expect(result[0].rules.summary.trim()).toBe(MEDIUM_TEXT.trim());
    expect(result[1].rules.summary.trim()).toBe(MEDIUM_TEXT.trim());
    expect(result[1].continuationOf).toBe(card.id);
  });

  it('does not split when [newcard] front or back would be empty', () => {
    const card = makeCard({ summary: `\n[newcard]${MEDIUM_TEXT}` });
    expect(splitOverflowCards([card])).toHaveLength(1);
  });

  it('is idempotent — running twice produces same result', () => {
    const card = makeCard({
      summary: `${MEDIUM_TEXT}\n[newcard]${MEDIUM_TEXT}`,
    });
    const once = splitOverflowCards([card]);
    const twice = splitOverflowCards(once);
    expect(twice.length).toBe(once.length);
  });

  it('does NOT produce empty intermediate cards when back has empty summary', () => {
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
});
