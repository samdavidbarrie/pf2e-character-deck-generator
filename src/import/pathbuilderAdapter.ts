import type { ActionCost } from '../model/cards';
import type {
  AbilityKey,
  CharacterAction,
  CharacterAttack,
  CharacterEquipment,
  CharacterFeat,
  CharacterModel,
  CharacterSpell,
  CreatureKind,
  LinkedCreature,
  ProficiencyRank,
  SkillProficiency,
} from '../model/character';
import { EIDOLON_REGISTRY } from './eidolonRegistry';

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
  if (s.match(/1.*(to|or|[-–]).*3/) || s.includes('one to three')) return '1-3';
  if (s.match(/1.*(to|or|[-–]).*2/) || s.includes('one to two')) return '1-2';
  if (s.match(/2.*(to|or|[-–]).*3/) || s.includes('two to three')) return '2-3';
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
// Linked creature detection
// ---------------------------------------------------------------------------

const PF2E_SKILL_SET = new Set([
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
]);

/**
 * Summoner class features and proficiency entries that appear in `specials`
 * but are NOT eidolon actions. Used to filter the specials list.
 */
const SUMMONER_NON_ACTION_SPECIALS = new Set([
  'Manifest Eidolon',
  'Instant Manifestation',
  'Act Together',
  'Share Senses',
  'Link Spells',
  'Evolution Feat',
  'Shared Vigilance',
  'Unlimited Signature Spells',
  'Expert Spellcaster',
  'Master Spellcaster',
  'Simple Weapon Expertise',
  'Weapon Specialization',
  'Greater Eidolon Specialization',
  'Defensive Robes',
  'Twin Juggernauts',
  'Shared Reflexes',
  'Shared Resolve',
  'Eidolon Unarmed Expertise',
  'Eidolon Weapon Specialization',
  'Eidolon Symbiosis',
  'Eidolon Defensive Expertise',
  'Eidolon Unarmed Mastery',
  'Eidolon Defensive Mastery',
  'Eidolon Transcendence',
]);

function isEidolonNonAction(special: string): boolean {
  const lower = special.toLowerCase();
  return (
    SUMMONER_NON_ACTION_SPECIALS.has(special) ||
    /\beidolon$/.test(lower) || // ends in " eidolon" — type identifier
    /^eidolon\s/.test(lower) || // starts with "eidolon " — proficiency feature
    /^shared\s/.test(lower) || // starts with "shared " — summoner feature
    PF2E_SKILL_SET.has(lower) // skill name — granted to eidolon, not an action
  );
}

function parseLinkedCreatures(
  build: Record<string, unknown>,
  specialsArr: string[],
): LinkedCreature[] {
  const creatures: LinkedCreature[] = [];

  // --- Eidolon (Summoner class) ---
  const charClass = str(get(build, 'class'));
  if (charClass === 'Summoner') {
    const eidolonTypeEntry = specialsArr.find((s) => /\beidolon$/i.test(s.trim()));
    if (eidolonTypeEntry) {
      // "Beast Eidolon" → subtype = "Beast"
      const subtype = eidolonTypeEntry.replace(/\s+Eidolon$/i, '').trim() || undefined;

      // Summoner convention in Pathbuilder: the deity field holds the eidolon's name.
      const eidolonName = str(get(build, 'deity')) ?? eidolonTypeEntry;

      // Extract eidolon-trained skills from specials (e.g. granted via Skilled Partner).
      // These supplement (and may overlap with) the registry base skills.
      const specialsTrainedSkills = new Set(
        specialsArr.filter((s) => PF2E_SKILL_SET.has(s.toLowerCase())).map((s) => s.toLowerCase()),
      );

      // Build a set of feat names so we can exclude them from eidolon actions.
      // Prevents ancestry/heritage feats in specials (e.g. "Versatile Human")
      // from being treated as eidolon abilities.
      const featNames = new Set(
        arr<unknown>(get(build, 'feats')).flatMap((f) => {
          const name = Array.isArray(f) ? str(f[0]) : str(get(f as object, 'name'));
          return name ? [name] : [];
        }),
      );

      // Resolve the registry entry for this eidolon type.
      const registryKey = subtype?.toLowerCase() ?? '';
      const entry = EIDOLON_REGISTRY[registryKey];

      // Traits: Eidolon + registry extra traits (or fall back to just the subtype label).
      const eidolonTraits = ['Eidolon', ...(entry?.extraTraits ?? (subtype ? [subtype] : []))];

      // Skills: merge registry base skills with specials-derived trained skills.
      const baseSkillNames = new Set((entry?.skills ?? []).map((s) => s.toLowerCase()));
      const eidolonSkills: SkillProficiency[] = [
        ...new Set([...baseSkillNames, ...specialsTrainedSkills]),
      ].map((s) => ({
        skill: s.charAt(0).toUpperCase() + s.slice(1),
        rank: 'trained' as ProficiencyRank,
      }));

      // Attacks: use registry when available.
      // Primary attacks carry NO preset traits or dice — the player chooses
      // from the four standard primary options at character creation.
      // Secondary attacks are always 1d6 Agile Finesse per the rules.
      const eidolonAttacks: CharacterAttack[] = entry
        ? entry.attacks.map((a) => ({
            name: a.name,
            damageType: a.damageType,
            traits: a.role === 'secondary' ? ['Agile', 'Finesse', 'Unarmed'] : ['Unarmed'],
            damageDice: a.role === 'secondary' ? 'd6' : undefined,
            isUnarmed: true,
          }))
        : [];

      // Actions: when a registry entry exists, use its canonical abilities.
      // For unknown types, fall back to specials-based detection.
      const eidolonActions: CharacterAction[] = entry
        ? entry.abilities.map((a): CharacterAction => ({
            name: a.name,
            actionCost: a.actionCost,
            traits: a.traits,
          }))
        : specialsArr
            .filter((s) => !isEidolonNonAction(s))
            .filter((s) => !featNames.has(s))
            .map((s): CharacterAction => ({
              name: s,
              actionCost: '2',
              traits: ['Eidolon'],
            }));

      creatures.push({
        id: crypto.randomUUID(),
        name: eidolonName,
        kind: 'eidolon' as CreatureKind,
        subtype,
        traits: eidolonTraits,
        hasFullStats: false,
        senses: entry?.senses,
        languages: entry?.languages,
        skills: eidolonSkills.length > 0 ? eidolonSkills : undefined,
        attacks: eidolonAttacks.length > 0 ? eidolonAttacks : undefined,
        actions: eidolonActions.length > 0 ? eidolonActions : undefined,
      });
    }
  }

  // --- Pets (animal companions) ---
  const petsRaw = arr<unknown>(get(build, 'pets'));
  for (const pet of petsRaw) {
    if (typeof pet !== 'object' || pet === null) continue;
    const name = str(get(pet, 'name')) ?? str(get(pet, 'animal')) ?? 'Animal Companion';
    const hasStats = !!(get(pet, 'hp') !== undefined || get(pet, 'ac') !== undefined);
    const petSkills: SkillProficiency[] = arr<unknown>(get(pet, 'skills')).flatMap((s) => {
      if (typeof s === 'string') return [{ skill: s, rank: 'trained' as ProficiencyRank }];
      const skillName = str(get(s, 'name')) ?? str(get(s, 'skill'));
      if (!skillName) return [];
      return [{ skill: skillName, rank: rankFromValue(get(s, 'rank')) }];
    });
    creatures.push({
      id: crypto.randomUUID(),
      name,
      kind: 'animal-companion' as CreatureKind,
      subtype: str(get(pet, 'animal')) ?? str(get(pet, 'species')),
      traits: ['Animal', 'Companion'],
      hasFullStats: hasStats,
      hp: num(get(pet, 'hp')),
      ac: num(get(pet, 'ac')),
      saves: {
        fortitude: num(get(pet, 'saves', 'fort')) ?? num(get(pet, 'fort')),
        reflex: num(get(pet, 'saves', 'ref')) ?? num(get(pet, 'ref')),
        will: num(get(pet, 'saves', 'will')) ?? num(get(pet, 'will')),
      },
      speed: num(get(pet, 'speed')),
      skills: petSkills.length > 0 ? petSkills : undefined,
    });
  }

  // --- Familiars ---
  const familiarsRaw = arr<unknown>(get(build, 'familiars'));
  for (const fam of familiarsRaw) {
    if (typeof fam !== 'object' || fam === null) continue;
    const name = str(get(fam, 'name')) ?? 'Familiar';
    const abilityNames = arr<string>(get(fam, 'abilities'));
    const famActions: CharacterAction[] = abilityNames
      .filter(Boolean)
      .map((ability): CharacterAction => ({
        name: ability,
        actionCost: 'passive',
        traits: ['Familiar'],
      }));
    creatures.push({
      id: crypto.randomUUID(),
      name,
      kind: 'familiar' as CreatureKind,
      traits: ['Familiar'],
      hasFullStats: false,
      actions: famActions.length > 0 ? famActions : undefined,
    });
  }

  return creatures;
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

  function strikingMult(v: unknown): number {
    const s = typeof v === 'string' ? v.toLowerCase() : '';
    if (s.includes('major')) return 4;
    if (s.includes('greater')) return 3;
    if (s.includes('striking')) return 2;
    return 1;
  }

  for (const w of weaponsRaw) {
    const name = str(get(w, 'name'));
    if (!name) continue;
    attacks.push({
      name,
      display: str(get(w, 'display')),
      traits: arr<string>(get(w, 'traits')),
      damageDice: str(get(w, 'die')) ?? str(get(w, 'damage')),
      damageType: str(get(w, 'damageType')),
      attackBonus: num(get(w, 'attack')),
      damageBonus: num(get(w, 'damageBonus')),
      diceMult: strikingMult(get(w, 'str')),
      extraDamage: arr<string>(get(w, 'extraDamage')).filter(Boolean),
      runes: arr<string>(get(w, 'runes')).filter(Boolean),
      fundamentalRunes: (() => {
        const pot = num(get(w, 'pot'));
        const striking = typeof get(w, 'str') === 'string' ? (get(w, 'str') as string).trim() : '';
        const parts: string[] = [];
        if (pot && pot > 0) parts.push(`+${pot}`);
        if (striking === 'striking') parts.push('Striking');
        else if (striking === 'greater striking') parts.push('Greater Striking');
        else if (striking === 'major striking') parts.push('Major Striking');
        return parts.length > 0 ? parts : undefined;
      })(),
      notes: str(get(w, 'notes')),
      isUnarmed: str(get(w, 'prof')) === 'unarmed',
    });
  }

  // --- Equipment ---
  const equipment: CharacterEquipment[] = [];
  const equipRaw = arr<unknown>(get(build, 'equipment'));
  for (const e of equipRaw) {
    if (Array.isArray(e)) {
      const name = str(e[0]);
      const quantity = typeof e[1] === 'number' ? e[1] : undefined;
      // Elements after index 1 can be a container UUID or the string "Invested"
      const invested = e
        .slice(2)
        .some((v) => typeof v === 'string' && v.toLowerCase() === 'invested');
      if (name) {
        equipment.push({ name, quantity, traits: [], invested });
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

  // --- Senses ---
  const SENSE_KEYWORDS = [
    'darkvision',
    'low-light vision',
    'scent',
    'tremorsense',
    'blindsight',
    'lifesense',
    'echolocation',
    'infrared vision',
  ];
  const specialsArr = arr<string>(get(build, 'specials'));
  const senses = specialsArr.filter((s) => SENSE_KEYWORDS.some((k) => s.toLowerCase().includes(k)));

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

  // --- Resistances / Weaknesses / Immunities ---
  // Pathbuilder exports these as string arrays, e.g. ["electricity 5", "fire 10"]
  function parseDefenseEntries(raw: unknown[]): Array<{ type: string; value: number }> {
    return raw.flatMap((s) => {
      if (typeof s !== 'string') return [];
      const parts = s.trim().split(/\s+/);
      const last = parts[parts.length - 1];
      const value = parseFloat(last);
      if (!isNaN(value) && parts.length > 1) {
        return [{ type: parts.slice(0, -1).join(' '), value }];
      }
      return [];
    });
  }
  const resistances = parseDefenseEntries(arr<unknown>(get(build, 'resistances')));
  const weaknesses = parseDefenseEntries(arr<unknown>(get(build, 'weaknesses')));
  const immunities = arr<string>(get(build, 'immunities')).filter(
    (s) => typeof s === 'string' && s.length > 0,
  );

  const linkedCreatures = parseLinkedCreatures(build, specialsArr);

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
    defenses: { ac, hp, perception, saves, resistances, weaknesses, immunities },
    speeds,
    languages,
    senses,
    traits: [
      str(get(build, 'sizeName')),
      str(get(build, 'ancestry')),
      str(get(build, 'heritage')),
    ].filter((t): t is string => !!t),
    deity: str(get(build, 'deity')),
    age: str(get(build, 'age')),
    gender: str(get(build, 'gender')),
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
    linkedCreatures: linkedCreatures.length > 0 ? linkedCreatures : undefined,
    rawSource: json,
  };
}

// Wrap parseActionCost so generation layer can reuse it
export { parseActionCost };
