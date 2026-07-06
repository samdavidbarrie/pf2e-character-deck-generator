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

  return { cards, warnings };
}
