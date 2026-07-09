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

    // Split only when the combined text genuinely won't fit on one card (~850 chars
    // is roughly the practical limit for a 63×88 mm card at 6–7 pt body text).
    if (hasOutcomes && summary.length + outcomesLength > 850) {
      // If the summary itself is too long, truncate it at a sentence boundary so
      // the front card doesn't overflow even after outcomes are moved to the back.
      const SUMMARY_LIMIT = 680;
      let frontSummary = summary;
      let spilloverSummary = '';
      if (summary.length > SUMMARY_LIMIT) {
        let breakAt = summary.lastIndexOf('. ', SUMMARY_LIMIT);
        if (breakAt < SUMMARY_LIMIT * 0.4) breakAt = summary.lastIndexOf(' ', SUMMARY_LIMIT);
        if (breakAt <= 0) breakAt = SUMMARY_LIMIT;
        frontSummary = summary.slice(0, breakAt + 1).trim();
        spilloverSummary = summary.slice(breakAt + 1).trim();
      }
      // Guard: if the front would be empty there is nothing to split off —
      // keep the card as-is rather than emitting an empty front card.
      if (frontSummary.length === 0) {
        result.push(card);
      } else {
        // Front: (truncated) summary only
        result.push({
          ...card,
          rules: {
            ...card.rules,
            summary: frontSummary,
            criticalSuccess: undefined,
            success: undefined,
            failure: undefined,
            criticalFailure: undefined,
          },
        });
        // Back: any spillover summary text + outcomes
        result.push({
          ...card,
          id: `${card.id}-back`,
          stableKey: `${card.stableKey}-back`,
          continuationOf: card.id,
          writableFields: [],
          rules: {
            ...card.rules,
            summary: spilloverSummary,
            traits: [],
            trigger: undefined,
            requirements: undefined,
            frequency: undefined,
            usage: undefined,
            bulk: undefined,
            price: undefined,
            activateTag: undefined,
          },
          userEdits: { edited: false },
        });
      }
    } else if (hasExtraSections && summary.length + extraSectionsText > 850) {
      // If the summary is long, truncate it so the front card doesn't overflow
      // even after extra sections are moved to the back.  Any spillover summary
      // text travels with the extra sections onto the back card.
      const SUMMARY_LIMIT = 680;
      let frontSummary = summary;
      let spilloverSummary = '';
      if (summary.length > SUMMARY_LIMIT) {
        let breakAt = summary.lastIndexOf('. ', SUMMARY_LIMIT);
        if (breakAt < SUMMARY_LIMIT * 0.4) breakAt = summary.lastIndexOf(' ', SUMMARY_LIMIT);
        if (breakAt <= 0) breakAt = SUMMARY_LIMIT;
        frontSummary = summary.slice(0, breakAt + 1).trim();
        spilloverSummary = summary.slice(breakAt + 1).trim();
      }
      // Guard: if the front would be empty (this card is already a continuation
      // with no summary, only extraSections), don't split — emitting an empty
      // front card would cascade across all 5 passes creating blank cards.
      if (frontSummary.length === 0) {
        result.push(card);
      } else {
        // Front: (truncated) summary, no extra section bodies
        result.push({
          ...card,
          rules: {
            ...card.rules,
            summary: frontSummary,
            extraSections: undefined,
          },
        });
        // Back: any spillover summary + extra sections
        result.push({
          ...card,
          id: `${card.id}-back`,
          stableKey: `${card.stableKey}-back`,
          continuationOf: card.id,
          writableFields: [],
          rules: {
            ...card.rules,
            summary: spilloverSummary,
            traits: [],
            trigger: undefined,
            requirements: undefined,
            frequency: undefined,
            usage: undefined,
            bulk: undefined,
            price: undefined,
            activateTag: undefined,
          },
          userEdits: { edited: false },
        });
      }
    } else if (!hasOutcomes && !hasExtraSections && summary.length > 800) {
      // Long plain summary — find the last sentence end before the threshold and
      // split there. Front shows the first chunk; back shows the rest.
      const THRESHOLD = 800;
      let breakAt = summary.lastIndexOf('. ', THRESHOLD);
      if (breakAt < THRESHOLD * 0.4) breakAt = summary.lastIndexOf(' ', THRESHOLD);
      if (breakAt <= 0) breakAt = THRESHOLD;
      const front = summary.slice(0, breakAt + 1).trim();
      const back = summary.slice(breakAt + 1).trim();
      // Guard: don't create an empty back card.
      if (back.length === 0) {
        result.push(card);
      } else {
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
            usage: undefined,
            bulk: undefined,
            price: undefined,
            activateTag: undefined,
            level: undefined,
          },
          userEdits: { edited: false },
        });
      }
    } else {
      result.push(card);
    }
  }
  return result;
}
