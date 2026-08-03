import type { CardModel, WritableField } from '../../model/cards';
import type { ProficiencyRank } from '../../model/character';

let _idCounter = 0;
function nextId(): string {
  return `generated-${++_idCounter}`;
}

export function blankField(label: string, size: WritableField['size'] = 'md'): WritableField {
  return { id: crypto.randomUUID(), label, type: 'blank', size };
}

export function checkboxField(label: string, boxes: number): WritableField {
  return { id: crypto.randomUUID(), label, type: 'checkboxes', boxes };
}

export function notesField(label = 'Notes'): WritableField {
  return { id: crypto.randomUUID(), label, type: 'notes', size: 'lg' };
}

/** A full-width section divider label — creates a visual break between groups of fields. */
export function sectionField(label: string): WritableField {
  return { id: crypto.randomUUID(), label, type: 'section' };
}

/**
 * A skill row: shows a TEML proficiency column (circles pre-filled up to rank)
 * with a blank total box.
 */
export function skillField(label: string, rank: ProficiencyRank): WritableField {
  return { id: crypto.randomUUID(), label, type: 'skill-row', rank };
}

/** A display-only text field — renders as a labelled value, no blank for writing. */
export function displayField(label: string, value: string): WritableField {
  return { id: crypto.randomUUID(), label, type: 'display', value };
}

/** A large HP-style field: bold label above a full-width underline blank.
 *  Pass size='lg' for a taller blank (e.g. Notes fields). */
export function hpField(label: string, size?: 'lg'): WritableField {
  return { id: crypto.randomUUID(), label, type: 'hp', ...(size ? { size } : {}) };
}

// Re-export nextId for templates that need a unique card id
export { nextId };

/**
 * Maps action/feat names to their primary skill for auto-populating the Bonus field.
 * 'any' means the action is available with any skill.
 */
export const ACTION_SKILL_MAP: Record<string, string> = {
  // Acrobatics
  Balance: 'Acrobatics',
  'Maneuver in Flight': 'Acrobatics',
  Squeeze: 'Acrobatics',
  'Tumble Through': 'Acrobatics',
  // Athletics
  Climb: 'Athletics',
  Disarm: 'Athletics',
  'Force Open': 'Athletics',
  Grapple: 'Athletics',
  'High Jump': 'Athletics',
  'Long Jump': 'Athletics',
  Shove: 'Athletics',
  Swim: 'Athletics',
  Trip: 'Athletics',
  // Deception
  'Create a Diversion': 'Deception',
  Feint: 'Deception',
  Impersonate: 'Deception',
  Lie: 'Deception',
  // Diplomacy
  'Gather Information': 'Diplomacy',
  'Make an Impression': 'Diplomacy',
  Request: 'Diplomacy',
  // Intimidation
  Coerce: 'Intimidation',
  Demoralize: 'Intimidation',
  // Medicine
  'Administer First Aid': 'Medicine',
  'Treat Disease': 'Medicine',
  'Treat Poison': 'Medicine',
  'Treat Wounds': 'Medicine',
  // Nature
  'Command an Animal': 'Nature',
  // Performance
  Perform: 'Performance',
  // Society
  'Create Forgery': 'Society',
  // Stealth
  'Conceal an Object': 'Stealth',
  Hide: 'Stealth',
  Sneak: 'Stealth',
  // Survival
  'Cover Tracks': 'Survival',
  Track: 'Survival',
  // Thievery
  'Disable a Device': 'Thievery',
  'Palm an Object': 'Thievery',
  'Pick a Lock': 'Thievery',
  Steal: 'Thievery',
  // Perception
  Seek: 'Perception',
  'Sense Motive': 'Perception',
};

/** Return `"{Skill}: + ___"` for the named action, or undefined if not a known skill action. */
export function skillBonusFor(actionName: string): string | undefined {
  const skill = ACTION_SKILL_MAP[actionName];
  return skill ? `${skill}: + ___` : undefined;
}

export function defaultCard(
  overrides: Partial<CardModel> & Pick<CardModel, 'title' | 'category' | 'stableKey'>,
): CardModel {
  return {
    id: nextId(),
    subtitle: undefined,
    source: { system: 'generated' },
    rules: {
      traits: [],
      summary:
        'Rules summary not imported. Add a short table-facing summary or use the source link.',
    },
    writableFields: [],
    print: { include: true, priority: 50, size: 'standard' },
    userEdits: { edited: false },
    ...overrides,
  };
}
