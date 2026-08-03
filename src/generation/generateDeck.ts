import type { CardModel } from '../model/cards';
import type { CharacterModel } from '../model/character';
import { generateBasicActionCards } from './templates/basicActions';
import { generateCreatureCards } from './templates/creatures';
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

  // Linked creatures (eidolons, companions, familiars)
  const linkedCreatures = char.linkedCreatures ?? [];
  linkedCreatures.forEach((creature, i) => {
    cards.push(...generateCreatureCards(creature, i));
  });

  cards.push(...generateReminderCards());

  // Sort: category → priority → level/rank ascending → alphabetical
  // All creature-* categories share order slot 11 so that priority alone
  // groups each creature’s cards together (face, skills, attacks, actions).
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
    'creature-summary': 11,
    'creature-skill': 11,
    'creature-attack': 11,
    'creature-action': 11,
    reminder: 12,
    manual: 13,
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
      body: boldRefs(s.body) ?? s.body,
    }));
  }

  return { cards, warnings };
}

/**
 * Split cards whose text won't fit on a single card.
 * Runs iteratively so that back cards which are themselves too long can be
 * split again, supporting 3+ card layouts. Stops once no new splits occur.
 * Back cards are inserted immediately after their front card.
 */
export function splitOverflowCards(cards: CardModel[]): CardModel[] {
  let current = cards;
  for (let pass = 0; pass < 5; pass++) {
    const next = splitOverflowOnce(current);
    if (next.length === current.length) break;
    current = next;
  }
  return current;
}

function splitOverflowOnce(cards: CardModel[]): CardModel[] {
  // Track which cards already have a back so we don't split them again this pass.
  const existingBackKeys = new Set(cards.filter((c) => c.continuationOf).map((c) => c.stableKey));

  const result: CardModel[] = [];
  for (const card of cards) {
    // Back card already exists for this card — keep as-is and move on.
    if (existingBackKeys.has(`${card.stableKey}-back`)) {
      result.push(card);
      continue;
    }

    // The ONLY way a card splits is via an explicit [newcard] marker in the summary.
    // The editor shows the marker as a display hint at the estimated split point;
    // the user can move or remove it before it is written back.
    const NEWCARD_RE = /\n\[newcard\]\n?/;
    if (NEWCARD_RE.test(card.rules.summary)) {
      const idx = card.rules.summary.search(NEWCARD_RE);
      const front = card.rules.summary.slice(0, idx).trim();
      const back = card.rules.summary.slice(idx).replace(NEWCARD_RE, '').trim();
      if (front.length > 0 && back.length > 0) {
        result.push({ ...card, rules: { ...card.rules, summary: front } });
        result.push({
          ...card,
          id: `${card.id}-back`,
          stableKey: `${card.stableKey}-back`,
          continuationOf: card.id,
          writableFields: [],
          rules: {
            ...card.rules,
            summary: back,
            traits: [],
            trigger: undefined,
            requirements: undefined,
            frequency: undefined,
            bonus: undefined,
          },
          userEdits: { edited: false },
        });
        continue;
      }
    }

    result.push(card);
  }
  return result;
}
