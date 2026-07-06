import type { CardModel } from '../../model/cards';
import type { CharacterModel } from '../../model/character';
import { buildStableKey } from '../../rules/nameNormalization';
import { checkboxField, defaultCard, notesField } from './_helpers';

export function generateEquipmentCards(char: CharacterModel): CardModel[] {
  return char.equipment
    .filter((e) => e.hasActivation || e.invested)
    .map((equip) =>
      defaultCard({
        title: equip.name,
        subtitle: equip.quantity !== undefined ? `×${equip.quantity}` : undefined,
        category: 'equipment',
        stableKey: buildStableKey('equipment', equip.name),
        rules: {
          traits: equip.traits,
          actionCost: equip.activationCost ? '1' : undefined,
          summary: equip.activationSummary ?? equip.notes ?? 'Rules summary not imported.',
        },
        print: { include: false, priority: 50, size: 'standard' },
        writableFields: [
          ...(equip.quantity ? [checkboxField('Uses', equip.quantity)] : []),
          notesField(),
        ],
      }),
    );
}
