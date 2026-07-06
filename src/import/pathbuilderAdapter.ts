import type { ActionCost } from '../model/cards';
import type {
  AbilityKey,
  CharacterAttack,
  CharacterEquipment,
  CharacterFeat,
  CharacterModel,
  CharacterSpell,
  ProficiencyRank,
  SkillProficiency,
} from '../model/character';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function get<T>(obj: unknown, ...keys: string[]): T | undefined {
  let cur: unknown = obj;
  for (const k of keys) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur as T;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function modFromScore(score: number): number {
  return Math.floor((score - 10) / 2);
}

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const RANK_MAP: Record<number, ProficiencyRank> = {
  0: 'untrained',
  2: 'trained',
  4: 'expert',
  6: 'master',
  8: 'legendary',
};

function rankFromValue(v: unknown): ProficiencyRank {
  const n = typeof v === 'number' ? v : 0;
  return RANK_MAP[n] ?? 'untrained';
}

function parseActionCost(v: unknown): ActionCost | undefined {
  const s = str(v)?.toLowerCase().trim();
  if (!s) return undefined;
  if (s.includes('free')) return 'free';
  if (s.includes('reaction')) return 'reaction';
  if (s === '1' || s === 'one') return '1';
  if (s === '2' || s === 'two') return '2';
  if (s === '3' || s === 'three') return '3';
  if (s.includes('variab') || s.includes('to')) return 'variable';
  return undefined;
}

// Map a Pathbuilder feat type label to our CharacterFeat type
function mapFeatType(raw: string, fallback: CharacterFeat['type']): CharacterFeat['type'] {
  const s = raw.toLowerCase();
  if (
    s.includes('class') ||
    s.includes('monk feat') ||
    s.includes('fighter feat') ||
    s.includes('rogue feat')
  )
    return 'class';
  if (s.includes('ancestry') || s.includes('heritage')) return 'ancestry';
  if (s.includes('skill')) return 'skill';
  if (s.includes('general')) return 'general';
  if (s.includes('archetype')) return 'archetype';
  if (s.includes('awarded') || s.includes('bonus')) return 'bonus';
  return fallback;
}

// Pathbuilder feat entries come in a variety of shapes:
// - [featName, subFeat, typeString, level, slotLabel, choiceType, parentSlot]
// - [featName, null, level]  (older format)
// - objects with .name, .level etc.
function parseFeatEntry(entry: unknown, defaultType: CharacterFeat['type']): CharacterFeat | null {
  if (Array.isArray(entry)) {
    const name = str(entry[0]);
    if (!name) return null;
    // New format: entry[2] is a string type label, entry[3] is the level
    if (typeof entry[2] === 'string') {
      return {
        name,
        type: mapFeatType(entry[2], defaultType),
        level: typeof entry[3] === 'number' ? entry[3] : 0,
        traits: [],
      };
    }
    // Old format: entry[2] is the level number
    return {
      name,
      type: defaultType,
      level: typeof entry[2] === 'number' ? entry[2] : 0,
      traits: [],
    };
  }
  if (typeof entry === 'object' && entry !== null) {
    const name = str(get(entry, 'name')) ?? str(get(entry, 'feat'));
    if (!name) return null;
    return {
      name,
      type: defaultType,
      level: num(get(entry, 'level')) ?? 0,
      traits: arr<string>(get(entry, 'traits')),
      actionCost: str(get(entry, 'action')),
      summary: str(get(entry, 'description')),
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main adapter
// ---------------------------------------------------------------------------

export function parsePathbuilder(json: unknown): CharacterModel {
  const build = get<Record<string, unknown>>(json, 'build') ?? {};

  // --- Abilities ---
  const abilitiesRaw = (get<Record<string, unknown>>(build, 'abilities') ?? {}) as Record<
    string,
    unknown
  >;
  const abilities = {} as Record<AbilityKey, number>;
  const abilityMods = {} as Record<AbilityKey, number>;
  for (const key of ABILITY_KEYS) {
    const score = typeof abilitiesRaw[key] === 'number' ? (abilitiesRaw[key] as number) : 10;
    abilities[key] = score;
    abilityMods[key] = modFromScore(score);
  }

  // --- Skills ---
  const skillsRaw = (get<Record<string, unknown>>(build, 'proficiencies') ?? {}) as Record<
    string,
    unknown
  >;
  const SKILL_NAMES = [
    'acrobatics',
    'arcana',
    'athletics',
    'crafting',
    'deception',
    'diplomacy',
    'intimidation',
    'medicine',
    'nature',
    'occultism',
    'performance',
    'religion',
    'society',
    'stealth',
    'survival',
    'thievery',
  ];
  const skills: SkillProficiency[] = SKILL_NAMES.map((skill) => ({
    skill,
    rank: rankFromValue(skillsRaw[skill]),
  }));

  // Lore skills
  const loreArr = arr<unknown>(get(build, 'lores'));
  const loreSkills: SkillProficiency[] = loreArr
    .map((l) => {
      const name = str(Array.isArray(l) ? l[0] : get(l, 'name'));
      const rank = Array.isArray(l) ? rankFromValue(l[1]) : rankFromValue(get(l, 'rank'));
      if (!name) return null;
      return { skill: `Lore (${name})`, rank };
    })
    .filter(Boolean) as SkillProficiency[];

  // --- Feats ---
  const featSections: Array<[string, CharacterFeat['type']]> = [
    ['ancestryFeats', 'ancestry'],
    ['heritageFeats', 'ancestry'],
    ['classFeats', 'class'],
    ['skillFeats', 'skill'],
    ['generalFeats', 'general'],
    ['archetypeFeats', 'archetype'],
    ['bonusFeats', 'bonus'],
  ];
  const feats: CharacterFeat[] = [];
  for (const [key, type] of featSections) {
    const section = arr<unknown>(get(build, key));
    for (const entry of section) {
      const feat = parseFeatEntry(entry, type);
      if (feat) feats.push(feat);
    }
  }
  // Some Pathbuilder exports put all feats in a single "feats" array
  if (feats.length === 0) {
    const allFeats = arr<unknown>(get(build, 'feats'));
    for (const entry of allFeats) {
      const feat = parseFeatEntry(entry, 'other');
      if (feat) feats.push(feat);
    }
  }

  // --- Spells ---
  const spells: CharacterSpell[] = [];
  const focusSpells: CharacterSpell[] = [];

  const spellCasters = arr<unknown>(get(build, 'spellCasters'));
  let focusPoints: number | undefined = num(get(build, 'focusPoints'));

  for (const caster of spellCasters) {
    const tradition = str(get(caster, 'magicTradition')) ?? str(get(caster, 'tradition'));
    const isFocus =
      get<boolean>(caster, 'focusSpells') === true ||
      str(get(caster, 'type'))?.toLowerCase() === 'focus';

    const spellList = arr<unknown>(get(caster, 'spells'));
    for (const spellEntry of spellList) {
      const spellsInSlot = arr<unknown>(get(spellEntry, 'list') ?? get(spellEntry, 'spells'));
      const rank = num(get(spellEntry, 'spellLevel')) ?? 0;

      for (const s of spellsInSlot) {
        const name = typeof s === 'string' ? s : str(get(s, 'name'));
        if (!name) continue;

        const card: CharacterSpell = {
          name,
          rank,
          tradition,
          traits: arr<string>(get(s, 'traits')),
          actionCost: str(get(s, 'cast')) ?? str(get(s, 'actions')),
          range: str(get(s, 'range')),
          area: str(get(s, 'area')),
          targets: str(get(s, 'targets')),
          defense: str(get(s, 'defense')) ?? str(get(s, 'save')),
          duration: str(get(s, 'duration')),
          summary: str(get(s, 'description')),
        };

        if (isFocus) {
          card.focusCost = 1;
          focusSpells.push(card);
          if (focusPoints === undefined) focusPoints = 1;
        } else {
          spells.push(card);
        }
      }
    }

    // Also handle cantrips / innate listed separately
    const cantrips = arr<unknown>(get(caster, 'cantrips'));
    for (const s of cantrips) {
      const name = typeof s === 'string' ? s : str(get(s, 'name'));
      if (!name) continue;
      spells.push({ name, rank: 0, tradition, traits: [] });
    }
  }

  // Parse focus spells from the build.focus object:
  // build.focus[tradition][abilityKey].focusSpells / focusCantrips = string[]
  const focusObj = get<Record<string, unknown>>(build, 'focus') ?? {};
  for (const [tradition, traditionVal] of Object.entries(focusObj)) {
    if (typeof traditionVal !== 'object' || traditionVal === null) continue;
    for (const casterVal of Object.values(traditionVal as Record<string, unknown>)) {
      if (typeof casterVal !== 'object' || casterVal === null) continue;
      const spellNames = arr<string>(get(casterVal, 'focusSpells'));
      const cantripNames = arr<string>(get(casterVal, 'focusCantrips'));
      for (const name of spellNames) {
        if (!name) continue;
        focusSpells.push({ name, rank: 0, tradition, traits: [], focusCost: 1 });
        if (focusPoints === undefined) focusPoints = 1;
      }
      for (const name of cantripNames) {
        if (!name) continue;
        focusSpells.push({ name, rank: 0, tradition, traits: [], focusCost: 0 });
      }
    }
  }

  // --- Weapons / Attacks ---
  const attacks: CharacterAttack[] = [];
  const weaponsRaw = arr<unknown>(get(build, 'weapons'));
  for (const w of weaponsRaw) {
    const name = str(get(w, 'name')) ?? str(get(w, 'display'));
    if (!name) continue;
    attacks.push({
      name,
      traits: arr<string>(get(w, 'traits')),
      damageDice: str(get(w, 'die')) ?? str(get(w, 'damage')),
      damageType: str(get(w, 'damageType')),
      notes: str(get(w, 'notes')),
    });
  }

  // --- Equipment ---
  const equipment: CharacterEquipment[] = [];
  const equipRaw = arr<unknown>(get(build, 'equipment'));
  for (const e of equipRaw) {
    if (Array.isArray(e)) {
      const name = str(e[0]);
      if (name) {
        equipment.push({ name, quantity: typeof e[1] === 'number' ? e[1] : undefined, traits: [] });
      }
    } else if (typeof e === 'object' && e !== null) {
      const name = str(get(e, 'name'));
      if (name) {
        equipment.push({
          name,
          quantity: num(get(e, 'quantity')),
          traits: arr<string>(get(e, 'traits')),
          hasActivation: !!get(e, 'activation'),
          activationCost: str(get(e, 'activation')),
        });
      }
    }
  }

  // --- Defenses ---
  const ac = num(get(build, 'acTotal', 'acTotal')) ?? num(get(build, 'armor', '0', 'acBonus'));
  const hp =
    num(get(build, 'attributes', 'ancestryhp')) === undefined
      ? undefined
      : (num(get(build, 'attributes', 'ancestryhp')) ?? 0) +
        (num(get(build, 'attributes', 'classhp')) ?? 0) +
        (num(get(build, 'attributes', 'bonushp')) ?? 0);

  const saves = {
    fortitude:
      num(get(build, 'saves', 'fortitude')) ?? num(get(build, 'proficiencies', 'fortitude')),
    reflex: num(get(build, 'saves', 'reflex')) ?? num(get(build, 'proficiencies', 'reflex')),
    will: num(get(build, 'saves', 'will')) ?? num(get(build, 'proficiencies', 'will')),
  };

  const perception = num(get(build, 'proficiencies', 'perception'));

  // --- Languages ---
  const languages = arr<string>(get(build, 'languages'));

  // --- Speeds ---
  const speedsRaw = get<Record<string, unknown>>(build, 'specials') ?? {};
  const speeds = {
    land: num(get(build, 'attributes', 'speed')) ?? 25,
    fly: num(speedsRaw['fly']),
    swim: num(speedsRaw['swim']),
    climb: num(speedsRaw['climb']),
    burrow: num(speedsRaw['burrow']),
  };

  // --- Class DC ---
  const classDC = num(get(build, 'proficiencies', 'classDC'));

  // --- Build result ---
  return {
    source: 'pathbuilder',
    importedAt: new Date().toISOString(),
    id: crypto.randomUUID(),
    name: str(get(build, 'name')) ?? 'Unknown Character',
    level: num(get(build, 'level')) ?? 1,
    ancestry: str(get(build, 'ancestry')),
    heritage: str(get(build, 'heritage')),
    background: str(get(build, 'background')),
    className: str(get(build, 'class')),
    subclass: str(get(build, 'subclass')),
    abilities,
    abilityMods,
    defenses: { ac, hp, perception, saves },
    speeds,
    languages,
    proficiencies: {
      skills: [...skills, ...loreSkills],
      classDC,
    },
    feats,
    spells,
    focusSpells,
    focusPoints,
    attacks,
    equipment,
    actions: [],
    rawSource: json,
  };
}

// Wrap parseActionCost so generation layer can reuse it
export { parseActionCost };
