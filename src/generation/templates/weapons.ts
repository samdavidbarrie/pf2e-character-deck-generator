import type { CardModel } from '../../model/cards';
import type { CharacterModel } from '../../model/character';
import { buildStableKey } from '../../rules/nameNormalization';
import { blankField, defaultCard, notesField } from './_helpers';

export function generateWeaponCards(char: CharacterModel): CardModel[] {
  return char.attacks.map((attack) =>
    defaultCard({
      title: attack.name,
      subtitle: attack.isUnarmed ? 'Unarmed Attack' : 'Weapon',
      category: 'weapon',
      stableKey: buildStableKey('weapon', attack.name),
      rules: {
        actionCost: '1',
        traits: attack.traits,
        summary: attack.damageType
          ? `${attack.damageDice ?? '?'} ${attack.damageType}`
          : (attack.damageDice ?? 'See weapon'),
      },
      print: { include: true, priority: 35, size: 'standard' },
      writableFields: [
        blankField('Attack bonus', 'sm'),
        blankField('Damage bonus', 'sm'),
        ...(attack.critSpecialization ? [notesField('Crit specialization')] : []),
        ...(attack.notes ? [notesField('Notes')] : []),
      ],
    }),
  );
}
