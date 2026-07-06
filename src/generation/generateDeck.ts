import type { CardModel } from '../model/cards';
import type { CharacterModel } from '../model/character';
import { generateBasicActionCards } from './templates/basicActions';
import { generateEquipmentCards } from './templates/equipment';
import { generateFeatCards } from './templates/feats';
import { generateReminderCards } from './templates/reminders';
import { generateFocusSpellCards, generateSpellCards } from './templates/spells';
import { generateSummaryCards } from './templates/summaries';
import { generateWeaponCards } from './templates/weapons';

export interface GenerationWarning {
  type: 'info' | 'warning';
  message: string;
}

export interface GenerationResult {
  cards: CardModel[];
  warnings: GenerationWarning[];
}

export function generateDeck(char: CharacterModel): GenerationResult {
  const warnings: GenerationWarning[] = [];
  const cards: CardModel[] = [];

  cards.push(...generateSummaryCards(char));
  cards.push(...generateBasicActionCards(char));
  cards.push(...generateWeaponCards(char));

  if (char.feats.length > 0) {
    cards.push(...generateFeatCards(char));
  } else {
    warnings.push({
      type: 'warning',
      message: 'No feats were found; feat cards were not generated.',
    });
  }

  if (char.spells.length > 0) {
    cards.push(...generateSpellCards(char));
  } else {
    warnings.push({ type: 'info', message: 'No spells found; spell cards were not generated.' });
  }

  if (char.focusSpells.length > 0) {
    cards.push(...generateFocusSpellCards(char));
  }

  cards.push(...generateEquipmentCards(char));
  cards.push(...generateReminderCards());

  // Sort: category → priority → level/rank ascending → alphabetical
  const CATEGORY_ORDER: Record<string, number> = {
    summary: 0,
    'basic-action': 1,
    'skill-action': 2,
    reaction: 3,
    'free-action': 4,
    'feat-action': 5,
    'feat-passive': 6,
    spell: 7,
    'focus-spell': 8,
    weapon: 9,
    equipment: 10,
    reminder: 11,
    manual: 12,
  };

  cards.sort((a, b) => {
    const catDiff = (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99);
    if (catDiff !== 0) return catDiff;
    const priDiff = a.print.priority - b.print.priority;
    if (priDiff !== 0) return priDiff;
    const aLevel = a.rules.level ?? a.rules.rank ?? 0;
    const bLevel = b.rules.level ?? b.rules.rank ?? 0;
    if (aLevel !== bLevel) return aLevel - bLevel;
    return a.title.localeCompare(b.title);
  });

  // Cross-reference pass: bold any card title that appears (plain) in another card's text.
  const sortedTitles = [...new Set(cards.map((c) => c.title))].sort((a, b) => b.length - a.length);
  function boldRefs(text: string | undefined): string | undefined {
    if (!text) return text;
    let out = text;
    for (const title of sortedTitles) {
      const esc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Only replace occurrences not already wrapped in **
      out = out.replace(new RegExp(`(?<!\\*)\\b${esc}\\b(?!\\*)`, 'g'), `**${title}**`);
    }
    return out;
  }
  for (const card of cards) {
    card.rules.summary = boldRefs(card.rules.summary) ?? card.rules.summary;
    card.rules.criticalSuccess = boldRefs(card.rules.criticalSuccess);
    card.rules.success = boldRefs(card.rules.success);
    card.rules.failure = boldRefs(card.rules.failure);
    card.rules.criticalFailure = boldRefs(card.rules.criticalFailure);
    card.rules.extraSections = card.rules.extraSections?.map((s) => ({
      ...s,
      body: boldRefs(s.body),
    }));
  }

  return { cards, warnings };
}

/**
 * Split cards whose summary + outcomes together won't fit on a single card.
 * Back cards are inserted immediately after their front card.
 * Safe to call multiple times — skips cards that already have a back.
 */
export function splitOverflowCards(cards: CardModel[]): CardModel[] {
  const existingBackKeys = new Set(cards.filter((c) => c.continuationOf).map((c) => c.stableKey));

  const result: CardModel[] = [];
  for (const card of cards) {
    // Already a back card — keep as-is
    if (card.continuationOf) {
      result.push(card);
      continue;
    }
    // Back card already exists for this front — keep front as-is
    if (existingBackKeys.has(`${card.stableKey}-back`)) {
      result.push(card);
      continue;
    }

    const { criticalSuccess, success, failure, criticalFailure, summary, extraSections } =
      card.rules;
    const hasOutcomes = !!(criticalSuccess || success || failure || criticalFailure);
    const outcomesLength =
      (criticalSuccess?.length ?? 0) +
      (success?.length ?? 0) +
      (failure?.length ?? 0) +
      (criticalFailure?.length ?? 0);
    const extraSectionsText = (extraSections ?? []).reduce((n, s) => n + s.body.length, 0);
    const hasExtraSections = (extraSections?.length ?? 0) > 0 && extraSectionsText > 0;

    // Split only when the combined text genuinely won't fit on one card (~700 chars
    // is roughly the practical limit for a 63×88 mm card at 7 pt body text).
    if (hasOutcomes && summary.length + outcomesLength > 700) {
      // Front: summary only
      result.push({
        ...card,
        rules: {
          ...card.rules,
          criticalSuccess: undefined,
          success: undefined,
          failure: undefined,
          criticalFailure: undefined,
        },
      });
      // Back: outcomes only
      result.push({
        ...card,
        id: `${card.id}-back`,
        stableKey: `${card.stableKey}-back`,
        continuationOf: card.id,
        rules: {
          ...card.rules,
          summary: '',
          traits: [],
          trigger: undefined,
          requirements: undefined,
          frequency: undefined,
        },
        userEdits: { edited: false },
      });
    } else if (hasExtraSections && summary.length + extraSectionsText > 700) {
      // Front: summary + rune names note, no extra section bodies
      result.push({
        ...card,
        rules: {
          ...card.rules,
          extraSections: undefined,
        },
      });
      // Back: extra sections only
      result.push({
        ...card,
        id: `${card.id}-back`,
        stableKey: `${card.stableKey}-back`,
        continuationOf: card.id,
        rules: {
          ...card.rules,
          summary: '',
          traits: [],
          trigger: undefined,
          requirements: undefined,
          frequency: undefined,
        },
        userEdits: { edited: false },
      });
    } else {
      result.push(card);
    }
  }
  return result;
}
