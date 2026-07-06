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
  traits: string[];
  damageDice?: string;
  damageType?: string;
  attackBonus?: number;
  critSpecialization?: string;
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

  rawSource: unknown;
}
