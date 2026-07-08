import type { CardModel } from '../../model/cards';
import type { CharacterModel, ProficiencyRank } from '../../model/character';
import { buildStableKey } from '../../rules/nameNormalization';
import { blankField, defaultCard, displayField, sectionField, skillField } from './_helpers';

const RANK_MAP: Record<number, ProficiencyRank> = {
  0: 'untrained',
  2: 'trained',
  4: 'expert',
  6: 'master',
  8: 'legendary',
};
function rankFromNum(v: number | undefined): ProficiencyRank {
  return (v !== undefined ? RANK_MAP[v] : undefined) ?? 'untrained';
}

export function generateSummaryCards(char: CharacterModel): CardModel[] {
  const cards: CardModel[] = [];

  // --- Combat Status (quadrant layout) ---
  const hasSpells = char.spells.length > 0;
  const sensesNote = char.senses && char.senses.length > 0 ? char.senses.join(' · ') : undefined;

  // Build Q4 notes: senses + resistances/weaknesses/immunities
  const defenseNoteLines: string[] = [
    ...(char.defenses.resistances ?? []).map((r) => `Resist ${r.value} ${r.type}`),
    ...(char.defenses.weaknesses ?? []).map((w) => `Weak ${w.value} ${w.type}`),
    ...(char.defenses.immunities ?? []).map((i) => `Immune ${i}`),
    ...(sensesNote ? [sensesNote] : []),
  ];

  const fortRank = rankFromNum(char.defenses.saves?.fortitude);
  const reflexRank = rankFromNum(char.defenses.saves?.reflex);
  const willRank = rankFromNum(char.defenses.saves?.will);
  const percRank = rankFromNum(char.defenses.perception);

  cards.push(
    defaultCard({
      title: char.name,
      category: 'summary',
      stableKey: buildStableKey('summary', 'combat-status'),
      layout: 'quadrant',
      rules: { traits: char.traits ?? [], summary: '' },
      print: { include: true, priority: 10, size: 'standard' },
      writableFields: [
        // Q1 — HP (top-left)
        { ...blankField('Current HP', 'lg'), quadrant: 1 },
        { ...blankField('Max HP', 'lg'), quadrant: 1 },
        { ...blankField('Temp HP', 'sm'), quadrant: 1 },

        // Q2 — Defence (top-right)
        { ...blankField('AC', 'sm'), quadrant: 2 },
        { ...blankField('Shield HP', 'sm'), quadrant: 2 },

        // Q3 — Saves & Perception (bottom-left, TEML rows)
        { ...skillField('Fort', fortRank), quadrant: 3 },
        { ...skillField('Ref', reflexRank), quadrant: 3 },
        { ...skillField('Will', willRank), quadrant: 3 },
        { ...skillField('Perception', percRank), quadrant: 3 },
        { ...blankField('Initiative', 'sm'), quadrant: 3 },

        // Q4 — Movement & Senses (bottom-right)
        { ...blankField('Speed (ft)', 'sm'), quadrant: 4 },
        ...(char.proficiencies.classDC !== undefined || char.className
          ? [{ ...blankField('Class DC', 'sm'), quadrant: 4 as const }]
          : []),
        ...(hasSpells ? [{ ...blankField('Spell DC', 'sm'), quadrant: 4 as const }] : []),
        ...defenseNoteLines.map((line) => ({
          ...displayField('', line),
          quadrant: 4 as const,
        })),
      ],
    }),
  );

  // --- Character Details ---
  const identityFields = [
    { label: 'Ancestry', value: char.ancestry },
    { label: 'Heritage', value: char.heritage },
    { label: 'Class', value: char.className },
    { label: 'Background', value: char.background },
    ...(char.deity ? [{ label: 'Deity', value: char.deity }] : []),
    ...(char.age ? [{ label: 'Age', value: char.age }] : []),
    ...(char.gender ? [{ label: 'Gender', value: char.gender }] : []),
    ...(char.languages && char.languages.length > 0
      ? [{ label: 'Languages', value: char.languages.join(', ') }]
      : []),
  ].filter((f) => f.value);

  cards.push(
    defaultCard({
      title: 'Character Details',
      category: 'summary',
      stableKey: buildStableKey('summary', 'character-details'),
      rankBlank: true,
      rules: { traits: [], summary: '' },
      print: { include: true, priority: 11, size: 'standard' },
      writableFields: [
        ...identityFields.map((f) => displayField(f.label, f.value!)),
        sectionField('Ability Modifiers'),
        blankField('STR', 'sm'),
        blankField('DEX', 'sm'),
        blankField('CON', 'sm'),
        blankField('INT', 'sm'),
        blankField('WIS', 'sm'),
        blankField('CHA', 'sm'),
      ],
    }),
  );

  // --- Skill Proficiencies ---
  const allSkillFields = char.proficiencies.skills
    .slice()
    .sort((a, b) => a.skill.localeCompare(b.skill))
    .map((s) => skillField(s.skill, s.rank));

  cards.push(
    defaultCard({
      title: 'Skill Proficiencies',
      category: 'summary',
      stableKey: buildStableKey('summary', 'skills'),
      rules: { traits: [], summary: '' },
      print: { include: true, priority: 12, size: 'standard' },
      writableFields: allSkillFields,
    }),
  );

  return cards;
}
