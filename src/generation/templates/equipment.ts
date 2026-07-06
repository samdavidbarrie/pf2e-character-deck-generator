import type { CardModel } from '../../model/cards';
import type { CharacterModel } from '../../model/character';
import { buildStableKey } from '../../rules/nameNormalization';
import { checkboxField, defaultCard } from './_helpers';

export function generateEquipmentCards(char: CharacterModel): CardModel[] {
  const cards: CardModel[] = [];

  for (const equip of char.equipment.filter((e) => e.hasActivation || e.invested)) {
    const baseKey = buildStableKey('equipment', equip.name);
    const count = equip.quantity ?? 1;
    const isLikelyConsumable = equip.traits.some((t) => t.toLowerCase() === 'consumable');

    for (let i = 0; i < count; i++) {
      // Items with quantity > 1 get an index suffix so each copy has a unique stableKey
      // and can be individually included/excluded in the deck builder.
      const stableKey = count > 1 ? `${baseKey}:${i}` : baseKey;
      cards.push(
        defaultCard({
          title: equip.name,
          category: 'equipment',
          stableKey,
          rules: {
            traits: equip.traits,
            actionCost: equip.activationCost ? '1' : undefined,
            summary: equip.activationSummary ?? equip.notes ?? 'Rules summary not imported.',
          },
          print: { include: false, priority: 50, size: 'standard' },
          writableFields: [
            ...(!isLikelyConsumable && count > 1 ? [checkboxField('Uses', count)] : []),
          ],
        }),
      );
    }
  }

  return cards;
}
