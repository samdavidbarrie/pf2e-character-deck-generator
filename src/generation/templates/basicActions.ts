import type { CardModel } from '../../model/cards';
import type { CharacterModel } from '../../model/character';
import { buildStableKey } from '../../rules/nameNormalization';
import { blankField, defaultCard } from './_helpers';

interface BasicAction {
  name: string;
  actionCost: '1' | '2' | '3' | 'free' | 'reaction' | 'variable';
  traits: string[];
  summary: string;
  requiresSkill?: string;
}

const UNIVERSAL_BASICS: BasicAction[] = [
  {
    name: 'Strike',
    actionCost: '1',
    traits: ['attack'],
    summary: 'Make a melee or ranged attack against an enemy.',
  },
  { name: 'Stride', actionCost: '1', traits: ['move'], summary: 'Move up to your Speed.' },
  {
    name: 'Step',
    actionCost: '1',
    traits: ['move'],
    summary: 'Move 5 feet without triggering reactions.',
  },
  {
    name: 'Seek',
    actionCost: '1',
    traits: ['concentrate', 'secret'],
    summary: 'Search for hidden or undetected creatures and objects in a 30-foot cone.',
  },
  {
    name: 'Interact',
    actionCost: '1',
    traits: ['manipulate'],
    summary: 'Grab, manipulate, or stow an item, open or close a door, etc.',
  },
  {
    name: 'Take Cover',
    actionCost: '1',
    traits: [],
    summary: 'Gain cover until your next turn or until you move.',
  },
  {
    name: 'Raise a Shield',
    actionCost: '1',
    traits: [],
    summary: "Gain your shield's bonus to AC until your next turn.",
  },
  {
    name: 'Aid',
    actionCost: 'reaction',
    traits: [],
    summary:
      'When an ally rolls a skill check or attack roll, grant a bonus with your prepared assistance.',
  },
  {
    name: 'Escape',
    actionCost: '1',
    traits: ['attack'],
    summary: 'Attempt to get free from a grapple, restrain, or similar condition.',
  },
  { name: 'Delay', actionCost: 'free', traits: [], summary: 'Wait and act later in the round.' },
  {
    name: 'Ready',
    actionCost: '2',
    traits: ['concentrate'],
    summary: 'Prepare a triggered action for later in the round.',
  },
  {
    name: 'Sustain',
    actionCost: '1',
    traits: ['concentrate'],
    summary: 'Extend a sustained spell or effect for another round.',
  },
];

const SKILL_BASICS: BasicAction[] = [
  {
    name: 'Recall Knowledge',
    actionCost: '1',
    traits: ['concentrate', 'secret'],
    summary:
      "Use a skill to remember facts about a subject. The relevant skill depends on what you're recalling.",
    requiresSkill: 'any',
  },
  {
    name: 'Treat Wounds',
    actionCost: '2',
    traits: ['healing', 'manipulate'],
    summary: 'Spend 10 minutes to restore HP to a willing adjacent creature.',
    requiresSkill: 'medicine',
  },
  {
    name: 'Demoralize',
    actionCost: '1',
    traits: ['auditory', 'concentrate', 'emotion', 'fear', 'mental'],
    summary: 'Frighten a foe within 30 feet with a Intimidation check.',
    requiresSkill: 'intimidation',
  },
  {
    name: 'Tumble Through',
    actionCost: '1',
    traits: ['move'],
    summary: "Stride through an enemy's space with an Acrobatics check.",
    requiresSkill: 'acrobatics',
  },
  {
    name: 'Feint',
    actionCost: '1',
    traits: ['mental'],
    summary: 'Mislead a foe with a Deception check to make them flat-footed.',
    requiresSkill: 'deception',
  },
  {
    name: 'Grapple',
    actionCost: '1',
    traits: ['attack'],
    summary: 'Restrain a creature adjacent to you with an Athletics check.',
    requiresSkill: 'athletics',
  },
  {
    name: 'Shove',
    actionCost: '1',
    traits: ['attack'],
    summary: 'Push a creature back 5 feet with an Athletics check.',
    requiresSkill: 'athletics',
  },
  {
    name: 'Trip',
    actionCost: '1',
    traits: ['attack'],
    summary: 'Knock a creature prone with an Athletics check.',
    requiresSkill: 'athletics',
  },
  {
    name: 'Disarm',
    actionCost: '1',
    traits: ['attack'],
    summary: "Knock a held item from a creature's grip with an Athletics check.",
    requiresSkill: 'athletics',
  },
];

export function generateBasicActionCards(char: CharacterModel): CardModel[] {
  const cards: CardModel[] = [];

  const trainedSkills = new Set(
    char.proficiencies.skills
      .filter((s) => s.rank !== 'untrained')
      .map((s) => s.skill.toLowerCase()),
  );

  for (const action of UNIVERSAL_BASICS) {
    cards.push(
      defaultCard({
        title: action.name,
        category:
          action.actionCost === 'reaction'
            ? 'reaction'
            : action.actionCost === 'free'
              ? 'free-action'
              : 'basic-action',
        stableKey: buildStableKey('basic-action', action.name),
        rules: {
          actionCost: action.actionCost,
          traits: action.traits,
          summary: action.summary,
        },
        print: { include: false, priority: 20, size: 'standard' },
        writableFields:
          action.name === 'Strike'
            ? [blankField('Attack bonus', 'sm'), blankField('Damage', 'sm')]
            : [],
      }),
    );
  }

  for (const action of SKILL_BASICS) {
    const skill = action.requiresSkill;
    const include = skill === 'any' || (skill !== undefined && trainedSkills.has(skill));

    if (!include) continue;

    cards.push(
      defaultCard({
        title: action.name,
        category: 'skill-action',
        stableKey: buildStableKey('skill-action', action.name),
        rules: {
          actionCost: action.actionCost,
          traits: action.traits,
          summary: action.summary,
        },
        print: { include: action.name !== 'Recall Knowledge', priority: 25, size: 'standard' },
        writableFields: [blankField('Skill bonus', 'sm')],
      }),
    );
  }

  return cards;
}
