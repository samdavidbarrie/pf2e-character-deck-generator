import type { CardModel } from '../../model/cards';
import type { CharacterArmor, CharacterModel } from '../../model/character';
import { SUMMARY_PLACEHOLDER } from '../../rules/aonEnrichment';
import { aonSearchUrl } from '../../rules/aonUrlResolver';
import { buildStableKey } from '../../rules/nameNormalization';
import { ARMOR_RUNE_PRICES, WEAPON_MATERIAL_PRICES } from '../../rules/weaponPricing';
import { defaultCard } from './_helpers';

/** Armor specialization effects by armor group (requires master proficiency). */
export const ARMOR_SPEC: Record<string, string> = {
  chain: 'Resistance 2 to piercing damage from ranged attacks.',
  composite: 'Resistance 3 to bludgeoning damage.',
  hide: 'You can use your Shield Block reaction to reduce bludgeoning or slashing damage as well as physical damage.',
  leather:
    'You can use your Shield Block reaction to reduce bludgeoning or slashing damage as well as physical damage.',
  plate: 'Resistance 3 to physical damage.',
  scale: 'Resistance 3 to piercing damage.',
  wood: 'Resistance 3 to electricity damage.',
};

/**
 * Reinforcing rune stat bonuses for shields.
 * These runes increase Hardness/HP/BT and are NOT separate item cards.
 */
export const REINFORCING_RUNE: Record<
  string,
  { hardnessBonus: number; hpBonus: number; level: number; gp: number }
> = {
  'reinforcing (minor)': { hardnessBonus: 3, hpBonus: 44, level: 4, gp: 75 },
  'reinforcing (lesser)': { hardnessBonus: 3, hpBonus: 52, level: 7, gp: 300 },
  'reinforcing (moderate)': { hardnessBonus: 3, hpBonus: 64, level: 10, gp: 900 },
  'reinforcing (greater)': { hardnessBonus: 5, hpBonus: 80, level: 13, gp: 2_500 },
  'reinforcing (major)': { hardnessBonus: 5, hpBonus: 84, level: 16, gp: 8_000 },
  'reinforcing (supreme)': { hardnessBonus: 7, hpBonus: 108, level: 19, gp: 32_000 },
};

export function generateArmorCards(char: CharacterModel): CardModel[] {
  const cards: CardModel[] = [];
  const seenRuneKeys = new Set<string>();
  const seenMaterialKeys = new Set<string>();

  for (const armor of char.armors.filter((a) => a.worn)) {
    cards.push(buildArmorCard(armor));

    // Rune cards: armor property runes (non-reinforcing) get equipment cards.
    // Reinforcing runes modify the shield's own stats and need no separate card.
    const propertyRunes = (armor.runes ?? []).filter((r) => !REINFORCING_RUNE[r.toLowerCase()]);
    for (const rune of propertyRunes) {
      const key = buildStableKey('armor-rune', rune);
      if (!seenRuneKeys.has(key)) {
        seenRuneKeys.add(key);
        cards.push(buildArmorRuneCard(rune));
      }
    }

    if (armor.material) {
      const matType = armor.category === 'shield' ? 'shield' : 'armor';
      const matKey = buildStableKey('material', armor.material + ':' + matType);
      if (!seenMaterialKeys.has(matKey)) {
        seenMaterialKeys.add(matKey);
        cards.push(buildMaterialCard(armor.material, matType));
      }
    }
  }

  return cards;
}

function buildMaterialCard(materialName: string, type: 'armor' | 'shield'): CardModel {
  // Construct the specific AoN variant: "Dawnsilver (High-Grade)" on armor
  // becomes "Dawnsilver Armor (High-Grade)" to match the AoN entry exactly.
  const m = materialName.match(/^(.+?)\s*\((.+?)\)$/);
  const typeLabel = type === 'armor' ? 'Armor' : 'Shield';
  const title = m ? `${m[1].trim()} ${typeLabel} (${m[2].trim()})` : materialName;
  return defaultCard({
    title,
    category: 'equipment',
    stableKey: buildStableKey('material', title),
    source: { system: 'generated' },
    rules: { traits: [], summary: SUMMARY_PLACEHOLDER },
    print: { include: true, priority: 38, size: 'standard' },
    writableFields: [],
  });
}

function buildArmorRuneCard(runeName: string): CardModel {
  return defaultCard({
    title: runeName,
    category: 'equipment',
    stableKey: buildStableKey('armor-rune', runeName),
    source: { system: 'generated', runes: [runeName] },
    rules: { traits: [], summary: SUMMARY_PLACEHOLDER },
    print: { include: true, priority: 38, size: 'standard' },
    writableFields: [],
  });
}

function buildArmorCard(armor: CharacterArmor): CardModel {
  const isShield = armor.category === 'shield';
  const title = armor.name;

  // Determine effective item level from runes + material.
  // For shields, also consider the reinforcing rune tier.
  const reinforcingRune = (armor.runes ?? []).find((r) => REINFORCING_RUNE[r.toLowerCase()]);
  const reinforcingLevel = reinforcingRune
    ? REINFORCING_RUNE[reinforcingRune.toLowerCase()].level
    : undefined;
  const itemLevel = computeEffectiveArmorLevel(
    armor.fundamentalRunes ?? [],
    armor.material,
    reinforcingLevel,
  );

  const summaryParts: string[] = [];
  summaryParts.push(SUMMARY_PLACEHOLDER);

  if ((armor.fundamentalRunes ?? []).length > 0) {
    summaryParts.push(`***Fundamental Runes***: ${armor.fundamentalRunes!.join(', ')}`);
  }

  // For shields: show ALL rune names (reinforcing handled structurally, others as items).
  // For armor: show property rune names only.
  if ((armor.runes ?? []).length > 0) {
    summaryParts.push(`***Property Runes***: ${armor.runes!.join(', ')}`);
  }

  if (armor.material) {
    summaryParts.push(`***Material***: ${armor.material}`);
  }

  const category: CardModel['category'] = isShield ? 'shield' : 'armor';

  return defaultCard({
    title,
    category,
    stableKey: buildStableKey(category, armor.name),
    source: {
      system: 'generated',
      originalName: armor.name,
      aonUrl: aonSearchUrl(armor.name),
      // Store ALL runes so AoN enrichment can detect reinforcing and apply bonuses.
      runes: armor.runes,
      ...(armor.material
        ? {
            material: (() => {
              const m = armor.material.match(/^(.+?)\s*\((.+?)\)$/);
              const tl = isShield ? 'Shield' : 'Armor';
              return m ? `${m[1].trim()} ${tl} (${m[2].trim()})` : armor.material;
            })(),
          }
        : {}),
    },
    rules: {
      traits:
        armor.category !== 'unarmored' && armor.category !== 'shield'
          ? [armor.category.charAt(0).toUpperCase() + armor.category.slice(1)]
          : [],
      summary: summaryParts.join('\n'),
      ...(itemLevel !== undefined ? { level: itemLevel } : {}),
      armorCategory: isShield
        ? 'Shield'
        : armor.category.charAt(0).toUpperCase() + armor.category.slice(1),
    },
    print: { include: true, priority: 37, size: 'standard' },
    writableFields: [],
  });
}

function computeEffectiveArmorLevel(
  fundamentalRunes: string[],
  material: string | undefined,
  reinforcingLevel?: number,
): number | undefined {
  let level = reinforcingLevel;

  for (const rune of fundamentalRunes) {
    const entry = ARMOR_RUNE_PRICES[rune.toLowerCase()];
    if (entry && (level === undefined || entry.level > level)) level = entry.level;
  }

  if (material) {
    const normMat = material
      .toLowerCase()
      .replace(/\s*\(.*\)/, '')
      .trim();
    const matEntry = WEAPON_MATERIAL_PRICES[normMat];
    if (matEntry) {
      const grade = material.toLowerCase().includes('low')
        ? 'low'
        : material.toLowerCase().includes('standard')
          ? 'standard'
          : 'high';
      const matLevel = matEntry[grade]?.level;
      if (matLevel !== undefined && (level === undefined || matLevel > level)) level = matLevel;
    }
  }

  return level;
}
