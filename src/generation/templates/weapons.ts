import type { CardModel } from '../../model/cards';
import type { CharacterAttack, CharacterModel } from '../../model/character';
import { SUMMARY_PLACEHOLDER } from '../../rules/aonEnrichment';
import { buildStableKey } from '../../rules/nameNormalization';
import { defaultCard } from './_helpers';

// ---------------------------------------------------------------------------
// Crit specialization by weapon group
// ---------------------------------------------------------------------------
const CRIT_SPEC: Record<string, string> = {
  axe: 'Choose one adjacent creature within reach. If its AC is lower than your attack roll result, deal weapon die damage to it (same type).',
  brawling:
    'Target must succeed at a Fortitude save (DC = your class DC) or be slowed 1 until the end of your next turn.',
  bow: 'If adjacent to a surface, target is stuck (immobilised, DC 10 Athletics to pull free).',
  club: 'Knock target up to 10 feet away (forced movement).',
  dart: 'Target takes 1d6 persistent bleed damage (+ weapon item bonus).',
  flail: 'Target is knocked prone.',
  hammer: 'Target is knocked prone.',
  knife: 'Target takes 1d6 persistent bleed damage (+ weapon item bonus).',
  pick: 'The weapon deals 2 additional damage per weapon damage die.',
  polearm: 'Target is moved 5 feet away from you (forced movement).',
  shield: 'Target suffers −2 circumstance penalty to AC until the start of your next turn.',
  sling: 'Target must succeed at a Fortitude save (DC = class DC or spell DC) or be stunned 1.',
  spear: 'The weapon pierces the target, dealing 2 additional damage per weapon damage die.',
  sword: 'Target is flat-footed until the start of your next turn.',
  whip: 'You can move the target up to 10 feet in any direction (forced movement).',
};

// Best-effort name → group lookup for common weapons and monk stance weapons
const NAME_TO_GROUP: Record<string, string> = {
  'tiger claw': 'brawling',
  'wolf jaw': 'brawling',
  'crane wing': 'brawling',
  'dragon tail': 'brawling',
  'wind crash': 'brawling',
  fist: 'brawling',
  'throwing knife': 'knife',
  dagger: 'knife',
  shortsword: 'sword',
  longsword: 'sword',
  greatsword: 'sword',
  rapier: 'sword',
  estoc: 'sword',
  handaxe: 'axe',
  battleaxe: 'axe',
  greataxe: 'axe',
  spear: 'spear',
  halberd: 'polearm',
  guisarme: 'polearm',
  glaive: 'polearm',
  warhammer: 'hammer',
  maul: 'hammer',
  shortbow: 'bow',
  longbow: 'bow',
  'composite shortbow': 'bow',
  'composite longbow': 'bow',
  crossbow: 'bow',
  pick: 'pick',
  flail: 'flail',
  whip: 'whip',
  sling: 'sling',
  dart: 'dart',
};

// ---------------------------------------------------------------------------
// Rune-effective item level
// ---------------------------------------------------------------------------

/**
 * Returns the minimum item level implied by the weapon's fundamental runes.
 * Used as a pre-enrichment estimate; AoN enrichment may raise it further via
 * the base weapon level, but never lowers a rune-set level.
 */
function effectiveRuneLevel(fundamentalRunes: string[]): number | undefined {
  const LEVELS: Record<string, number> = {
    '+1': 2,
    '+2': 10,
    '+3': 16,
    striking: 4,
    'greater striking': 12,
    'major striking': 19,
  };
  let max: number | undefined;
  for (const rune of fundamentalRunes) {
    const lvl = LEVELS[rune.toLowerCase()];
    if (lvl !== undefined) max = max === undefined ? lvl : Math.max(max, lvl);
  }
  return max;
}
const DAMAGE_TYPE_LABEL: Record<string, string> = {
  S: 'Slashing',
  P: 'Piercing',
  B: 'Bludgeoning',
  'B, P or S': 'B/P/S',
};

function normaliseDamageType(raw: string): string {
  return DAMAGE_TYPE_LABEL[raw] ?? raw;
}

function inferGroup(attack: CharacterAttack): string | undefined {
  if (attack.group) return attack.group;
  const nameLower = attack.name.toLowerCase();
  const keys = Object.keys(NAME_TO_GROUP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (nameLower.includes(key)) return NAME_TO_GROUP[key];
  }
  // All unarmed attacks default to brawling for crit spec purposes
  if (attack.isUnarmed) return 'brawling';
  return undefined;
}

// Traits / range for named unarmed attacks that Pathbuilder doesn't export.
// Covers all core Monk stance weapons and common ki-power strikes.
// Keyed by lowercased name (after stripping "Special Unarmed" prefix).
interface UnarmedAttackData {
  traits: string[];
  range?: string;
}
const UNARMED_ATTACK_DATA: Record<string, UnarmedAttackData> = {
  // Cobra Stance
  'cobra fang': { traits: ['Agile', 'Deadly', 'Finesse', 'Unarmed', 'Venomous'] },
  // Crane Stance
  'crane wing': { traits: ['Agile', 'Finesse', 'Nonlethal', 'Unarmed'] },
  // Dragon Stance
  'dragon tail': { traits: ['Backswing', 'Nonlethal', 'Unarmed'] },
  // Mountain Stance
  'falling stone': { traits: ['Forceful', 'Nonlethal', 'Unarmed'] },
  // Rain of Embers Stance
  'fire talon': { traits: ['Agile', 'Finesse', 'Fire', 'Nonlethal', 'Unarmed'] },
  // Stoked Flame Stance
  'flashing spark': { traits: ['Forceful', 'Nonlethal', 'Sweep', 'Unarmed'] },
  // Flood Stance
  'flooded river': { traits: ['Nonlethal', 'Trip', 'Unarmed', 'Water'] },
  // Reflective Ripple Stance
  'flowing wave': {
    traits: ['Agile', 'Disarm', 'Finesse', 'Nonlethal', 'Trip', 'Unarmed', 'Water'],
  },
  // Twisting Petal Stance
  'gale blossom': { traits: ['Agile', 'Finesse', 'Nonlethal', 'Shove', 'Unarmed'] },
  // Gorilla Stance
  'gorilla slam': { traits: ['Backswing', 'Forceful', 'Grapple', 'Nonlethal', 'Unarmed'] },
  // Ironblood Stance
  'iron sweep': { traits: ['Nonlethal', 'Parry', 'Sweep', 'Unarmed'] },
  // Tangled Forest Stance
  'lashing branch': { traits: ['Agile', 'Finesse', 'Nonlethal', 'Unarmed'] },
  // Rushing Goat Stance
  'ramming horn': { traits: ['Forceful', 'Nonlethal', 'Shove', 'Unarmed'] },
  // Jellyfish Stance
  'shadow grasp': { traits: ['Agile', 'Grapple', 'Reach', 'Unarmed'] },
  // Kaiju Stance
  'shattering earth': { traits: ['Backswing', 'Fatal', 'Reach', 'Unarmed'] },
  // Jellyfish Stance (secondary)
  'stinging lash': { traits: ['Finesse', 'Nonlethal', 'Reach', 'Unarmed'] },
  // Stumbling Stance
  'stumbling swing': { traits: ['Agile', 'Backstabber', 'Finesse', 'Nonlethal', 'Unarmed'] },
  // Tiger Stance
  'tiger claw': { traits: ['Agile', 'Finesse', 'Nonlethal', 'Unarmed'] },
  // Vitality-Manipulating Stance
  'vitality blast': { traits: ['Unarmed', 'Versatile'], range: '30 ft.' },
  // Wild Winds Stance
  'wind crash': { traits: ['Agile', 'Nonlethal', 'Propulsive', 'Unarmed'], range: '30 ft.' },
  // Wolf Stance
  'wolf jaw': { traits: ['Agile', 'Backstabber', 'Finesse', 'Nonlethal', 'Unarmed'] },
};
// Only includes traits the *weapon* gains (not the rune's own traits).
const RUNE_WEAPON_TRAITS: Record<string, string[]> = {
  astral: ['Force', 'Spirit'],
  impactful: ['Force'],
  flaming: ['Fire'],
  frost: ['Cold'],
  shock: ['Electricity'],
  thundering: ['Sonic'],
  corrosive: ['Acid'],
  holy: ['Holy'],
  unholy: ['Unholy'],
  disrupting: ['Positive'],
};

function traitsFromRunes(runes: string[]): string[] {
  const added: string[] = [];
  for (const rune of runes) {
    const granted = RUNE_WEAPON_TRAITS[rune.toLowerCase()];
    if (granted) added.push(...granted);
  }
  return added;
}

function buildMainCard(attack: CharacterAttack): CardModel {
  // Strip the 'Special Unarmed' prefix only when a real name remains afterwards.
  // A result that is purely a parenthetical die size like '(1d6)' is not a name.
  const stripped = attack.name.replace(/^special\s+unarmed\s+/i, '').trim();
  const title = /^\([^)]+\)$/.test(stripped) ? attack.name : stripped;
  const die = attack.damageDice ?? 'd?';
  const type = normaliseDamageType(attack.damageType ?? '');

  // Blanks for fillable numbers; die type and damage type are pre-printed
  const damageLine = `Damage: ___ ${die} + ___ ${type}`;
  const extraLines = (attack.extraDamage ?? []).map((d) => `+${d}`);

  // Runes line: fundamental runes first, then property runes
  const allRunes = [...(attack.fundamentalRunes ?? []), ...(attack.runes ?? [])];
  const runeNote = allRunes.length > 0 ? `Runes: ${allRunes.join(', ')}` : '';
  const materialNote = attack.material ? `Material: ${attack.material}` : '';
  const summaryParts = ['Hit: + ___', damageLine, ...extraLines, runeNote, materialNote].filter(
    Boolean,
  );
  const summary = summaryParts.join('\n');

  // Effective item level from fundamental runes (pre-enrichment; AoN fills base level if absent).
  const runeLevel = effectiveRuneLevel(attack.fundamentalRunes ?? []);

  // Merge base traits + traits granted by property runes, deduplicated.
  // For named unarmed attacks (monk stances / ki powers), seed from the
  // lookup table since Pathbuilder doesn't export weapon traits.
  const normalizedTitle = title.toLowerCase();
  const unarmedData = attack.isUnarmed ? UNARMED_ATTACK_DATA[normalizedTitle] : undefined;
  const baseTraits = unarmedData ? unarmedData.traits : attack.traits;
  const runeTraits = traitsFromRunes(attack.runes ?? []);
  const traits = [...new Set([...baseTraits, ...runeTraits, 'Attack'])];

  // Range: from unarmed lookup table (Pathbuilder doesn't export it)
  const range = unarmedData?.range;

  // Only crit spec in extraSections; rune descriptions live on separate cards.
  // Stance reminder (if known) appended after crit spec.
  const extraSections: Array<{ heading?: string; body: string }> = [];
  const group = inferGroup(attack);
  const critSpec = group ? CRIT_SPEC[group] : undefined;
  if (critSpec) {
    extraSections.push({ heading: 'Critical Specialization', body: critSpec });
  }

  return defaultCard({
    title,
    category: 'weapon',
    stableKey: buildStableKey('weapon', attack.name),
    source: { system: 'generated', runes: attack.runes },
    rules: {
      actionCost: '1',
      traits,
      summary,
      ...(runeLevel !== undefined ? { level: runeLevel } : {}),
      ...(range ? { range } : {}),
      ...(extraSections.length > 0 ? { extraSections } : {}),
    },
    print: { include: true, priority: 35, size: 'standard' },
    writableFields: [],
  });
}

function buildRuneCard(runeName: string): CardModel {
  return defaultCard({
    // Use the bare rune name (e.g. "Astral") so the AoN lookup matches exactly.
    title: runeName,
    // 'equipment' routes the card through the full equipment enrichment pipeline
    // (variant matching, usage, price, activateTag, activation section splitting).
    category: 'equipment',
    // Keep the weapon-rune stableKey prefix for backward compatibility with saved projects.
    stableKey: buildStableKey('weapon-rune', runeName),
    source: { system: 'generated', runes: [runeName] },
    rules: {
      traits: [],
      summary: SUMMARY_PLACEHOLDER,
    },
    print: { include: true, priority: 36, size: 'standard' },
    writableFields: [],
  });
}

export function generateWeaponCards(char: CharacterModel): CardModel[] {
  const cards: CardModel[] = [];
  const seenRuneKeys = new Set<string>();

  for (const attack of char.attacks) {
    cards.push(buildMainCard(attack));

    for (const rune of attack.runes ?? []) {
      const key = buildStableKey('weapon-rune', rune);
      if (!seenRuneKeys.has(key)) {
        seenRuneKeys.add(key);
        cards.push(buildRuneCard(rune));
      }
    }
  }

  return cards;
}
