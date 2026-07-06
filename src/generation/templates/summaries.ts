import type { CardModel } from '../../model/cards';
import type { CharacterModel } from '../../model/character';
import { buildStableKey } from '../../rules/nameNormalization';
import { blankField, checkboxField, defaultCard, sectionField, skillField } from './_helpers';

export function generateSummaryCards(char: CharacterModel): CardModel[] {
  const cards: CardModel[] = [];

  // --- Combat Status ---
  const combatSubtitle = [
    [char.ancestry, char.className].filter(Boolean).join(' '),
    char.background,
  ]
    .filter(Boolean)
    .join(' · ');

  cards.push(
    defaultCard({
      title: char.name,
      subtitle: combatSubtitle,
      category: 'summary',
      stableKey: buildStableKey('summary', 'combat-status'),
      rules: { traits: [], summary: '' },
      print: { include: true, priority: 10, size: 'standard' },
      writableFields: [
        sectionField('HP'),
        blankField('Max HP', 'lg'),
        blankField('Current HP', 'lg'),
        blankField('Temp HP', 'sm'),
        checkboxField('Wounded', 4),
        sectionField('Armor'),
        blankField('AC', 'sm'),
        blankField('Shield HP', 'sm'),
        sectionField('Saves & Perception'),
        blankField('Fortitude', 'sm'),
        blankField('Reflex', 'sm'),
        blankField('Will', 'sm'),
        blankField('Perception', 'sm'),
        sectionField('Other'),
        blankField('Speed (ft)', 'sm'),
        ...(char.proficiencies.classDC !== undefined || char.className
          ? [blankField('Class DC', 'sm')]
          : []),
        blankField('Resistances', 'lg'),
      ],
    }),
  );

  // --- Character Details ---
  const detailLines: string[] = [
    [char.ancestry, char.className, char.background].filter(Boolean).join(' · '),
  ].filter(Boolean);

  if (char.languages && char.languages.length > 0) {
    detailLines.push(`Languages: ${char.languages.join(', ')}`);
  }

  if (char.senses && char.senses.length > 0) {
    detailLines.push(`Senses: ${char.senses.join(', ')}`);
  }

  cards.push(
    defaultCard({
      title: 'Character Details',
      subtitle: char.name,
      category: 'summary',
      stableKey: buildStableKey('summary', 'character-details'),
      rules: { traits: [], summary: detailLines.join('\n') },
      print: { include: true, priority: 11, size: 'standard' },
      writableFields: [
        blankField('Level', 'sm'),
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
