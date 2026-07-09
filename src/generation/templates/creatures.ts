import { parseActionCost } from '../../import/pathbuilderAdapter';
import type { CardModel } from '../../model/cards';
import type { LinkedCreature } from '../../model/character';
import { aonSearchUrl } from '../../rules/aonUrlResolver';
import { buildStableKey } from '../../rules/nameNormalization';
import { blankField, defaultCard, displayField, notesField, skillField } from './_helpers';

// All 16 standard PF2e skills shown on every creature skill card.
const STANDARD_SKILLS = [
  'Acrobatics',
  'Arcana',
  'Athletics',
  'Crafting',
  'Deception',
  'Diplomacy',
  'Intimidation',
  'Medicine',
  'Nature',
  'Occultism',
  'Performance',
  'Religion',
  'Society',
  'Stealth',
  'Survival',
  'Thievery',
];

// ---------------------------------------------------------------------------
// Face card
// ---------------------------------------------------------------------------

export function generateCreatureFaceCard(creature: LinkedCreature, priority: number): CardModel {
  // Known senses/languages → display field; unknown → writable blank.
  const sensesField =
    creature.senses && creature.senses.length > 0
      ? { ...displayField('Senses', creature.senses.join(', ')), quadrant: 4 as const }
      : { ...blankField('Senses', 'md'), quadrant: 4 as const };

  const langField =
    creature.languages && creature.languages.length > 0
      ? { ...displayField('Languages', creature.languages.join(', ')), quadrant: 4 as const }
      : { ...blankField('Languages', 'md'), quadrant: 4 as const };

  return defaultCard({
    title: creature.name,
    category: 'creature-summary',
    layout: 'quadrant',
    stableKey: buildStableKey(`creature:${creature.kind}`, creature.name, 'face'),
    rules: { traits: creature.traits, summary: '' },
    print: { include: true, priority, size: 'standard' },
    writableFields: [
      // Q1 — HP (top-left)
      { ...blankField('Current HP', 'lg'), quadrant: 1 },
      { ...blankField('Max HP', 'lg'), quadrant: 1 },

      // Q2 — Defence (top-right)
      { ...blankField('AC', 'sm'), quadrant: 2 },
      { ...blankField('Speed (ft)', 'sm'), quadrant: 2 },

      // Q3 — Saves & Perception (bottom-left)
      { ...skillField('Fort', creature.saves?.fortitudeRank ?? 'untrained'), quadrant: 3 },
      { ...skillField('Ref', creature.saves?.reflexRank ?? 'untrained'), quadrant: 3 },
      { ...skillField('Will', creature.saves?.willRank ?? 'untrained'), quadrant: 3 },
      { ...skillField('Perception', creature.perceptionRank ?? 'untrained'), quadrant: 3 },

      // Q4 — Senses & Languages (bottom-right)
      sensesField,
      langField,
    ],
  });
}

// ---------------------------------------------------------------------------
// Skill card
// ---------------------------------------------------------------------------

/**
 * Always shows all 16 standard PF2e skills for eidolons and animal companions.
 * Skills in creature.skills get their stored rank; all others default to untrained.
 * Familiars and other kinds only get a card if skills are explicitly provided.
 */
export function generateCreatureSkillCard(
  creature: LinkedCreature,
  priority: number,
): CardModel | null {
  const alwaysShowAll = creature.kind === 'eidolon' || creature.kind === 'animal-companion';

  if (!alwaysShowAll && (!creature.skills || creature.skills.length === 0)) return null;

  const rankLookup = new Map((creature.skills ?? []).map((s) => [s.skill.toLowerCase(), s.rank]));

  const skillFields = STANDARD_SKILLS.map((skill) =>
    skillField(skill, rankLookup.get(skill.toLowerCase()) ?? 'untrained'),
  );

  return defaultCard({
    title: `${creature.name} Skills`,
    category: 'creature-skill',
    stableKey: buildStableKey(`creature:${creature.kind}`, creature.name, 'skills'),
    rules: { traits: [], summary: '' },
    print: { include: true, priority, size: 'standard' },
    writableFields: skillFields,
  });
}

// ---------------------------------------------------------------------------
// Attack cards
// ---------------------------------------------------------------------------

export function generateCreatureAttackCards(
  creature: LinkedCreature,
  basePriority: number,
): CardModel[] {
  if (!creature.attacks || creature.attacks.length === 0) return [];

  return creature.attacks.map((attack, i) => {
    const damageType = attack.damageType ?? '';

    // A secondary eidolon attack is always 1d6 Agile Finesse per the rules.
    // A primary eidolon attack has no preset dice — player chose from 4 options.
    const isEidolonSecondary =
      !!attack.isUnarmed &&
      attack.damageDice === 'd6' &&
      attack.traits.includes('Agile') &&
      attack.traits.includes('Finesse');
    const isEidolonPrimary =
      !!attack.isUnarmed && !attack.damageDice && !attack.traits.includes('Agile');

    let summary: string;
    if (isEidolonPrimary) {
      summary = [
        `Damage type: ${damageType}`,
        'Hit: + ___',
        'Damage: ___ + ___',
        'Choose ONE primary attack option:',
        '• 1d8  (disarm / nonlethal / shove / trip)',
        '• 1d6  (fatal d10)',
        '• 1d6  (forceful and sweep)',
        '• 1d6  (deadly d8 and finesse)',
        "↳ Make your choice, edit this card's Traits, then delete these notes.",
      ].join('\n');
    } else if (isEidolonSecondary) {
      summary = ['Hit: + ___', `Damage: ___ d6 + ___ ${damageType}`.trimEnd()].join('\n');
    } else {
      const die = attack.damageDice ?? 'd?';
      const damageLine = `Damage: ___ ${die} + ___ ${damageType}`.trimEnd();
      const extraLines = (attack.extraDamage ?? []).map((d) => `+${d}`);
      summary = ['Hit: + ___', damageLine, ...extraLines].filter(Boolean).join('\n');
    }

    return defaultCard({
      title: attack.name,
      category: 'creature-attack',
      stableKey: buildStableKey(`creature:${creature.kind}`, creature.name, 'attack', attack.name),
      source: {
        system: 'generated',
        originalName: attack.name,
        aonUrl: aonSearchUrl(attack.name),
      },
      rules: {
        traits: [...new Set([...attack.traits, 'Attack'])],
        summary,
      },
      print: { include: true, priority: basePriority + i, size: 'standard' },
      writableFields: [notesField()],
    });
  });
}

// ---------------------------------------------------------------------------
// Action cards
// ---------------------------------------------------------------------------

export function generateCreatureActionCards(
  creature: LinkedCreature,
  basePriority: number,
): CardModel[] {
  if (!creature.actions || creature.actions.length === 0) return [];

  return creature.actions
    .filter((action) => action.name)
    .map((action, i) => {
      const cost = parseActionCost(action.actionCost);
      return defaultCard({
        title: action.name,
        category: 'creature-action',
        stableKey: buildStableKey(
          `creature:${creature.kind}`,
          creature.name,
          'action',
          action.name,
        ),
        source: {
          system: 'generated',
          originalName: action.name,
          aonUrl: aonSearchUrl(action.name),
        },
        rules: {
          actionCost: cost,
          traits: action.traits,
          trigger: action.trigger,
          requirements: action.requirements,
          frequency: action.frequency,
          summary:
            action.summary ??
            'Rules summary not imported. Add a short table-facing summary or use the source link.',
        },
        print: { include: true, priority: basePriority + i, size: 'standard' },
        writableFields: cost ? [notesField()] : [],
      });
    });
}

// ---------------------------------------------------------------------------
// Combined
// ---------------------------------------------------------------------------

/**
 * Generate all cards for a linked creature. The creatureIndex is used to
 * assign priorities so that all cards for one creature sort together, before
 * cards for the next creature.
 */
export function generateCreatureCards(
  creature: LinkedCreature,
  creatureIndex: number,
): CardModel[] {
  // Each creature occupies a priority band of 100 slots.
  // Within the band: 0=face, 10=skills, 20-29=attacks, 40-79=actions.
  const band = creatureIndex * 100;

  const cards: CardModel[] = [];

  cards.push(generateCreatureFaceCard(creature, band));

  const skillCard = generateCreatureSkillCard(creature, band + 10);
  if (skillCard) cards.push(skillCard);

  cards.push(...generateCreatureAttackCards(creature, band + 20));
  cards.push(...generateCreatureActionCards(creature, band + 40));

  return cards;
}
