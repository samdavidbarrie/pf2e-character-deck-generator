import type { CardModel } from '../../model/cards';
import type { CharacterModel } from '../../model/character';
import { buildStableKey } from '../../rules/nameNormalization';
import { blankField, checkboxField, defaultCard, sectionField, skillField } from './_helpers';

export function generateSummaryCards(char: CharacterModel): CardModel[] {
  const cards: CardModel[] = [];

  // --- Combat Status ---
  const abilityMods = (['str', 'dex', 'con', 'int', 'wis', 'cha'] as const)
    .map((k) => `${k.toUpperCase()} ${char.abilityMods[k] >= 0 ? '+' : ''}${char.abilityMods[k]}`)
    .join('  ');

  const combatSubtitle = [
    `Level ${char.level}`,
    [char.ancestry, char.className].filter(Boolean).join(' ') +
      (char.background ? ` / ${char.background}` : ''),
  ]
    .filter(Boolean)
    .join(' · ');

  cards.push(
    defaultCard({
      title: char.name,
      subtitle: combatSubtitle,
      category: 'summary',
      stableKey: buildStableKey('summary', 'combat-status'),
      rules: { traits: [], summary: abilityMods },
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
    [char.ancestry, char.className].filter(Boolean).join(' ') +
      (char.background ? ` / ${char.background}` : ''),
  ].filter(Boolean);

  if (char.languages && char.languages.length > 0) {
    detailLines.push(`Languages: ${char.languages.join(', ')}`);
  }

  const halfMods = (['str', 'dex', 'con'] as const)
    .map((k) => `${k.toUpperCase()} ${char.abilityMods[k] >= 0 ? '+' : ''}${char.abilityMods[k]}`)
    .join('  ');
  const halfMods2 = (['int', 'wis', 'cha'] as const)
    .map((k) => `${k.toUpperCase()} ${char.abilityMods[k] >= 0 ? '+' : ''}${char.abilityMods[k]}`)
    .join('  ');
  detailLines.push(halfMods);
  detailLines.push(halfMods2);

  cards.push(
    defaultCard({
      title: 'Character Details',
      subtitle: `${char.name} — Level ${char.level}`,
      category: 'summary',
      stableKey: buildStableKey('summary', 'character-details'),
      rules: { traits: [], summary: detailLines.join('\n') },
      print: { include: true, priority: 11, size: 'standard' },
      writableFields: [],
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
