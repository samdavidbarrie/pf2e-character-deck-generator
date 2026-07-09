export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type ProficiencyRank = 'untrained' | 'trained' | 'expert' | 'master' | 'legendary';

export interface SkillProficiency {
  skill: string;
  rank: ProficiencyRank;
  bonus?: number;
}

export interface ProficiencyBlock {
  name: string;
  rank: ProficiencyRank;
}

export interface SpellcastingBlock {
  tradition: string;
  rank: ProficiencyRank;
  spellDC?: number;
  spellAttack?: number;
}

export interface CharacterFeat {
  name: string;
  type: 'ancestry' | 'class' | 'skill' | 'general' | 'archetype' | 'bonus' | 'other';
  level: number;
  traits: string[];
  actionCost?: string;
  trigger?: string;
  requirements?: string;
  frequency?: string;
  summary?: string;
  sourceUrl?: string;
  sourceRef?: string;
}

export interface CharacterSpell {
  name: string;
  rank: number;
  tradition?: string;
  actionCost?: string;
  traits: string[];
  range?: string;
  area?: string;
  targets?: string;
  defense?: string;
  duration?: string;
  heightened?: string;
  summary?: string;
  sourceUrl?: string;
  focusCost?: number;
}

export interface CharacterAttack {
  name: string;
  /** Full display name including rune descriptors, e.g. "+2 Striking Astral Special Unarmed Tiger Claw". */
  display?: string;
  traits: string[];
  damageDice?: string;
  damageType?: string;
  attackBonus?: number;
  damageBonus?: number;
  /** Dice multiplier from striking rune: 1 = base, 2 = striking, 3 = greater, 4 = major. */
  diceMult?: number;
  /** Extra damage entries from property runes, e.g. ["1d6 Spirit", "1d6 Force"]. */
  extraDamage?: string[];
  /** Property rune names, e.g. ["Astral", "Impactful"]. */
  runes?: string[];
  /** Fundamental rune display names, e.g. ["+2", "Striking"]. */
  fundamentalRunes?: string[];
  critSpecialization?: string;
  group?: string;
  notes?: string;
  isUnarmed?: boolean;
}

export interface CharacterEquipment {
  name: string;
  quantity?: number;
  traits: string[];
  hasActivation?: boolean;
  activationCost?: string;
  activationSummary?: string;
  invested?: boolean;
  notes?: string;
}

export interface CharacterAction {
  name: string;
  actionCost: string;
  traits: string[];
  trigger?: string;
  requirements?: string;
  frequency?: string;
  summary?: string;
  sourceRef?: string;
}

export type CreatureKind = 'eidolon' | 'animal-companion' | 'familiar' | 'pet' | 'other';

export interface LinkedCreature {
  id: string;
  name: string;
  kind: CreatureKind;
  /** E.g. "Beast", "Dragon" for eidolons; animal species for companions. */
  subtype?: string;
  /** Display traits, e.g. ["Huge", "Eidolon", "Beast"]. */
  traits: string[];
  size?: string;
  /**
   * True when the import provided structured combat stats (HP, AC, saves, etc.).
   * False when only partial data is available (e.g. eidolon inferred from summoner specials).
   */
  hasFullStats: boolean;

  // Combat stats — absent if partial
  hp?: number;
  ac?: number;
  saves?: {
    fortitude?: number;
    fortitudeRank?: ProficiencyRank;
    reflex?: number;
    reflexRank?: ProficiencyRank;
    will?: number;
    willRank?: ProficiencyRank;
  };
  perceptionRank?: ProficiencyRank;
  speed?: number;
  senses?: string[];
  languages?: string[];
  abilityMods?: Partial<Record<AbilityKey, number>>;

  skills?: SkillProficiency[];
  attacks?: CharacterAttack[];
  actions?: CharacterAction[];
}

export interface CharacterModel {
  source: 'pathbuilder' | 'manual';
  sourceVersion?: string;
  importedAt: string;

  id: string;
  name: string;
  level: number;
  ancestry?: string;
  heritage?: string;
  background?: string;
  className?: string;
  subclass?: string;

  abilities: Record<AbilityKey, number>;
  abilityMods: Record<AbilityKey, number>;

  defenses: {
    ac?: number;
    hp?: number;
    perception?: number;
    perceptionTraits?: string[];
    saves?: {
      fortitude?: number;
      reflex?: number;
      will?: number;
    };
    resistances?: Array<{ type: string; value: number }>;
    weaknesses?: Array<{ type: string; value: number }>;
    immunities?: string[];
  };

  speeds?: {
    land?: number;
    fly?: number;
    swim?: number;
    climb?: number;
    burrow?: number;
  };

  languages?: string[];
  senses?: string[];
  traits?: string[];
  deity?: string;
  age?: string;
  gender?: string;

  proficiencies: {
    skills: SkillProficiency[];
    weapons?: ProficiencyBlock[];
    armor?: ProficiencyBlock[];
    spellcasting?: SpellcastingBlock[];
    classDC?: number;
  };

  feats: CharacterFeat[];
  spells: CharacterSpell[];
  focusSpells: CharacterSpell[];
  focusPoints?: number;
  attacks: CharacterAttack[];
  equipment: CharacterEquipment[];
  actions: CharacterAction[];
  linkedCreatures?: LinkedCreature[];

  rawSource: unknown;
}
