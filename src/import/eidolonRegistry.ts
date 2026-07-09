/**
 * Static reference data for all known Pathfinder 2e eidolon types.
 *
 * Sources: Archives of Nethys – Summoner Eidolons
 *   https://2e.aonprd.com/Eidolons.aspx
 *
 * Each entry is keyed by the lowercased eidolon subtype as extracted from
 * the Pathbuilder `specials` field (e.g. "Beast Eidolon" → "beast").
 *
 * Traits listed here are in ADDITION to the universal "Eidolon" trait.
 * Attacks list the two canonical primary/secondary forms for card generation.
 * Abilities cover all three tiers: Initial (lv1), Symbiosis (lv7), Transcendence (lv17).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single eidolon ability, action, reaction, or passive feature. */
export interface EidolonAbility {
  name: string;
  /** PF2e action cost: '1', '2', '3', 'free', 'reaction', 'passive' */
  actionCost: string;
  /** Summoner level at which this ability unlocks. */
  level: 1 | 7 | 17;
  traits: string[];
}

/** A canonical unarmed attack template. */
export interface EidolonAttackTemplate {
  name: string;
  damageType: string;
  /** Base die, e.g. 'd8' (primary) or 'd6' (secondary). */
  damageDice: string;
  traits: string[];
}

/** Full static data for one eidolon type. */
export interface EidolonEntry {
  /** Additional game-mechanical traits beyond the universal 'Eidolon' trait. */
  extraTraits: string[];
  tradition: string;
  /** Skills the eidolon is trained in by default (before evolution feats). */
  skills: string[];
  senses: string[];
  languages: string[];
  /**
   * Canonical primary and secondary attack forms.
   * Primary is listed first (d8 die), secondary second (d6 die).
   */
  attacks: EidolonAttackTemplate[];
  abilities: EidolonAbility[];
  aonUrl: string;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const EIDOLON_REGISTRY: Record<string, EidolonEntry> = {
  // ── ID=1 ─────────────────────────────────────────────────────────────────
  angel: {
    extraTraits: ['Angel', 'Celestial'],
    tradition: 'Divine',
    skills: ['Diplomacy', 'Religion'],
    senses: ['Darkvision'],
    languages: ['Celestial'],
    attacks: [
      {
        name: 'Wing',
        damageType: 'Bludgeoning',
        damageDice: 'd6',
        traits: ['Agile', 'Finesse', 'Unarmed'],
      },
      {
        name: 'Fist',
        damageType: 'Bludgeoning',
        damageDice: 'd4',
        traits: ['Agile', 'Nonlethal', 'Unarmed'],
      },
    ],
    abilities: [
      {
        name: 'Hallowed Strikes',
        actionCost: 'passive',
        level: 1,
        traits: ['Divine', 'Eidolon'],
      },
      {
        name: "Traveler's Aura",
        actionCost: 'passive',
        level: 7,
        traits: ['Abjuration', 'Aura', 'Divine', 'Eidolon'],
      },
      {
        name: 'Angelic Mercy',
        actionCost: 'passive',
        level: 17,
        traits: ['Divine', 'Eidolon', 'Healing'],
      },
    ],
    aonUrl: 'https://2e.aonprd.com/Eidolons.aspx?ID=1',
  },

  // ── ID=2 ─────────────────────────────────────────────────────────────────
  'anger phantom': {
    extraTraits: ['Ethereal', 'Phantom'],
    tradition: 'Occult',
    skills: ['Intimidation', 'Occultism'],
    senses: ['Darkvision'],
    languages: [],
    attacks: [
      {
        name: 'Tendril',
        damageType: 'Bludgeoning',
        damageDice: 'd8',
        traits: ['Unarmed'],
      },
      {
        name: 'Fist',
        damageType: 'Bludgeoning',
        damageDice: 'd6',
        traits: ['Agile', 'Finesse', 'Unarmed'],
      },
    ],
    abilities: [
      {
        name: 'Furious Strike',
        actionCost: '2',
        level: 1,
        traits: ['Eidolon'],
      },
      {
        name: 'Seething Frenzy',
        actionCost: '1',
        level: 7,
        traits: ['Concentrate', 'Eidolon', 'Emotion', 'Mental'],
      },
      {
        name: 'Anger Aura',
        actionCost: 'passive',
        level: 17,
        traits: ['Aura', 'Eidolon', 'Emotion', 'Enchantment', 'Mental', 'Occult'],
      },
    ],
    aonUrl: 'https://2e.aonprd.com/Eidolons.aspx?ID=2',
  },

  // ── ID=3 ─────────────────────────────────────────────────────────────────
  beast: {
    extraTraits: ['Beast'],
    tradition: 'Primal',
    skills: ['Athletics', 'Survival'],
    senses: ['Darkvision', 'Scent (imprecise) 30 ft.'],
    languages: [],
    attacks: [
      {
        name: 'Jaws',
        damageType: 'Piercing',
        damageDice: 'd8',
        traits: ['Deadly d10', 'Unarmed'],
      },
      {
        name: 'Claw',
        damageType: 'Slashing',
        damageDice: 'd6',
        traits: ['Agile', 'Finesse', 'Unarmed'],
      },
    ],
    abilities: [
      {
        name: "Beast's Charge",
        actionCost: '2',
        level: 1,
        traits: ['Eidolon', 'Move'],
      },
      {
        name: 'Primal Roar',
        actionCost: '2',
        level: 7,
        traits: ['Auditory', 'Eidolon', 'Emotion', 'Fear', 'Mental', 'Primal'],
      },
      {
        name: 'Whirlwind Maul',
        actionCost: '3',
        level: 17,
        traits: ['Eidolon'],
      },
    ],
    aonUrl: 'https://2e.aonprd.com/Eidolons.aspx?ID=3',
  },

  // ── ID=4 ─────────────────────────────────────────────────────────────────
  construct: {
    extraTraits: ['Astral', 'Construct'],
    tradition: 'Arcane',
    skills: ['Arcana', 'Crafting'],
    senses: ['Darkvision'],
    languages: [],
    attacks: [
      {
        name: 'Fist',
        damageType: 'Bludgeoning',
        damageDice: 'd8',
        traits: ['Unarmed'],
      },
    ],
    abilities: [
      {
        name: 'Construct Heart',
        actionCost: 'passive',
        level: 1,
        traits: ['Eidolon'],
      },
      {
        name: 'Reconfigured Evolution',
        actionCost: 'passive',
        level: 7,
        traits: ['Eidolon'],
      },
      {
        name: 'Ultimate Reconfiguration',
        actionCost: 'passive',
        level: 17,
        traits: ['Eidolon'],
      },
    ],
    aonUrl: 'https://2e.aonprd.com/Eidolons.aspx?ID=4',
  },

  // ── ID=5 ─────────────────────────────────────────────────────────────────
  demon: {
    extraTraits: ['Demon', 'Fiend'],
    tradition: 'Divine',
    skills: ['Intimidation', 'Religion'],
    senses: ['Darkvision'],
    languages: ['Abyssal'],
    attacks: [
      {
        name: 'Jaws',
        damageType: 'Piercing',
        damageDice: 'd8',
        traits: ['Unarmed'],
      },
      {
        name: 'Claw',
        damageType: 'Slashing',
        damageDice: 'd6',
        traits: ['Agile', 'Finesse', 'Unarmed'],
      },
    ],
    abilities: [
      {
        name: 'Demonic Strikes',
        actionCost: 'passive',
        level: 1,
        traits: ['Eidolon', 'Unholy'],
      },
      {
        name: 'Visions of Sin',
        actionCost: '2',
        level: 7,
        traits: ['Divine', 'Eidolon', 'Emotion', 'Mental'],
      },
      {
        name: 'Blasphemous Decree',
        actionCost: 'passive',
        level: 17,
        traits: ['Divine', 'Eidolon', 'Evil'],
      },
    ],
    aonUrl: 'https://2e.aonprd.com/Eidolons.aspx?ID=5',
  },

  // ── ID=6 ─────────────────────────────────────────────────────────────────
  'devotion phantom': {
    extraTraits: ['Ethereal', 'Phantom'],
    tradition: 'Occult',
    skills: ['Medicine', 'Occultism'],
    senses: ['Darkvision'],
    languages: [],
    attacks: [
      {
        name: 'Tendril',
        damageType: 'Bludgeoning',
        damageDice: 'd8',
        traits: ['Unarmed'],
      },
      {
        name: 'Fist',
        damageType: 'Bludgeoning',
        damageDice: 'd6',
        traits: ['Agile', 'Finesse', 'Unarmed'],
      },
    ],
    abilities: [
      {
        name: 'Dutiful Retaliation',
        actionCost: 'reaction',
        level: 1,
        traits: ['Eidolon', 'Occult', 'Transmutation'],
      },
      {
        name: 'Steadfast Devotion',
        actionCost: 'passive',
        level: 7,
        traits: ['Eidolon'],
      },
      {
        name: 'Devotion Aura',
        actionCost: 'passive',
        level: 17,
        traits: ['Abjuration', 'Aura', 'Eidolon', 'Occult'],
      },
    ],
    aonUrl: 'https://2e.aonprd.com/Eidolons.aspx?ID=6',
  },

  // ── ID=7 ─────────────────────────────────────────────────────────────────
  dragon: {
    extraTraits: ['Astral', 'Dragon'],
    tradition: 'Arcane',
    skills: ['Arcana', 'Intimidation'],
    senses: ['Darkvision'],
    languages: ['Draconic'],
    attacks: [
      {
        name: 'Jaws',
        damageType: 'Piercing',
        damageDice: 'd8',
        traits: ['Deadly d8', 'Unarmed'],
      },
      {
        name: 'Claw',
        damageType: 'Slashing',
        damageDice: 'd6',
        traits: ['Agile', 'Unarmed'],
      },
    ],
    abilities: [
      {
        name: 'Breath Weapon',
        actionCost: '2',
        level: 1,
        traits: ['Arcane', 'Eidolon', 'Evocation'],
      },
      {
        name: 'Draconic Frenzy',
        actionCost: '2',
        level: 7,
        traits: ['Eidolon'],
      },
      {
        name: "Wyrm's Breath",
        actionCost: 'free',
        level: 17,
        traits: ['Concentrate', 'Eidolon'],
      },
    ],
    aonUrl: 'https://2e.aonprd.com/Eidolons.aspx?ID=7',
  },

  // ── ID=8 ─────────────────────────────────────────────────────────────────
  fey: {
    extraTraits: ['Fey'],
    tradition: 'Primal',
    skills: ['Deception', 'Nature'],
    senses: ['Low-Light Vision'],
    languages: ['Fey'],
    attacks: [
      {
        name: 'Wing',
        damageType: 'Bludgeoning',
        damageDice: 'd6',
        traits: ['Agile', 'Finesse', 'Unarmed'],
      },
      {
        name: 'Fist',
        damageType: 'Bludgeoning',
        damageDice: 'd4',
        traits: ['Agile', 'Nonlethal', 'Unarmed'],
      },
    ],
    abilities: [
      {
        name: 'Fey Gift Spells',
        actionCost: 'passive',
        level: 1,
        traits: ['Eidolon', 'Primal'],
      },
      {
        name: 'Fey Mischief',
        actionCost: 'passive',
        level: 7,
        traits: ['Eidolon', 'Primal'],
      },
      {
        name: 'Fey Chicanery',
        actionCost: 'passive',
        level: 17,
        traits: ['Eidolon', 'Primal'],
      },
    ],
    aonUrl: 'https://2e.aonprd.com/Eidolons.aspx?ID=8',
  },

  // ── ID=9 ─────────────────────────────────────────────────────────────────
  plant: {
    extraTraits: ['Plant'],
    tradition: 'Primal',
    skills: ['Nature', 'Survival'],
    senses: ['Low-Light Vision'],
    languages: [],
    attacks: [
      {
        name: 'Vine',
        damageType: 'Bludgeoning',
        damageDice: 'd8',
        traits: ['Unarmed'],
      },
      {
        name: 'Branch',
        damageType: 'Bludgeoning',
        damageDice: 'd6',
        traits: ['Agile', 'Unarmed'],
      },
    ],
    abilities: [
      {
        name: 'Tendril Strike',
        actionCost: '1',
        level: 1,
        traits: ['Eidolon'],
      },
      {
        name: 'Growing Vines',
        actionCost: 'passive',
        level: 7,
        traits: ['Eidolon', 'Primal'],
      },
      {
        name: 'Field of Roots',
        actionCost: '2',
        level: 17,
        traits: ['Eidolon', 'Primal'],
      },
    ],
    aonUrl: 'https://2e.aonprd.com/Eidolons.aspx?ID=9',
  },

  // ── ID=10 ────────────────────────────────────────────────────────────────
  psychopomp: {
    extraTraits: ['Monitor', 'Psychopomp'],
    tradition: 'Divine',
    skills: ['Intimidation', 'Religion'],
    senses: ['Darkvision'],
    languages: ['Requian'],
    attacks: [
      {
        name: 'Jaws',
        damageType: 'Piercing',
        damageDice: 'd8',
        traits: ['Unarmed'],
      },
      {
        name: 'Claw',
        damageType: 'Slashing',
        damageDice: 'd6',
        traits: ['Agile', 'Finesse', 'Unarmed'],
      },
    ],
    abilities: [
      {
        name: 'Spirit Touch',
        actionCost: 'passive',
        level: 1,
        traits: ['Eidolon'],
      },
      {
        name: 'Hidden Watcher',
        actionCost: 'passive',
        level: 7,
        traits: ['Divine', 'Eidolon', 'Illusion'],
      },
      {
        name: 'Spirit Taker',
        actionCost: 'passive',
        level: 17,
        traits: ['Divine', 'Eidolon'],
      },
    ],
    aonUrl: 'https://2e.aonprd.com/Eidolons.aspx?ID=10',
  },

  // ── ID=11 ────────────────────────────────────────────────────────────────
  undead: {
    extraTraits: ['Undead'],
    tradition: 'Divine',
    skills: ['Intimidation', 'Religion'],
    senses: ['Darkvision'],
    languages: [],
    attacks: [
      {
        name: 'Jaws',
        damageType: 'Piercing',
        damageDice: 'd8',
        traits: ['Unarmed'],
      },
      {
        name: 'Claw',
        damageType: 'Slashing',
        damageDice: 'd6',
        traits: ['Agile', 'Finesse', 'Unarmed'],
      },
    ],
    abilities: [
      {
        name: 'Negative Essence',
        actionCost: 'passive',
        level: 1,
        traits: ['Eidolon', 'Necromancy', 'Negative'],
      },
      {
        name: 'Drain Life',
        actionCost: '2',
        level: 7,
        traits: ['Divine', 'Eidolon', 'Necromancy', 'Negative'],
      },
      {
        name: 'Rejuvenation',
        actionCost: 'passive',
        level: 17,
        traits: ['Divine', 'Eidolon', 'Healing', 'Necromancy'],
      },
    ],
    aonUrl: 'https://2e.aonprd.com/Eidolons.aspx?ID=11',
  },

  // ── ID=12 ────────────────────────────────────────────────────────────────
  // Element (Air/Earth/Fire/Metal/Water/Wood) is chosen at character creation.
  // Base traits and language vary; only the shared defaults are listed here.
  elemental: {
    extraTraits: ['Elemental'],
    tradition: 'Primal',
    skills: ['Nature', 'Survival'],
    senses: ['Darkvision'],
    languages: [],
    attacks: [
      {
        name: 'Spike',
        damageType: 'Piercing',
        damageDice: 'd8',
        traits: ['Unarmed'],
      },
      {
        name: 'Fist',
        damageType: 'Bludgeoning',
        damageDice: 'd6',
        traits: ['Agile', 'Finesse', 'Unarmed'],
      },
    ],
    abilities: [
      {
        name: 'Elemental Core',
        actionCost: 'passive',
        level: 1,
        traits: ['Eidolon', 'Primal'],
      },
      {
        name: 'Elemental Burst',
        actionCost: '2',
        level: 7,
        traits: ['Eidolon', 'Primal'],
      },
      {
        name: 'Elemental Maelstrom',
        actionCost: '3',
        level: 17,
        traits: ['Eidolon', 'Primal'],
      },
    ],
    aonUrl: 'https://2e.aonprd.com/Eidolons.aspx?ID=12',
  },

  // ── ID=13 ────────────────────────────────────────────────────────────────
  swarm: {
    extraTraits: ['Animal', 'Swarm'],
    tradition: 'Primal',
    skills: ['Nature', 'Survival'],
    senses: ['Low-Light Vision'],
    languages: [],
    attacks: [
      {
        name: 'Jaws',
        damageType: 'Piercing',
        damageDice: 'd8',
        traits: ['Unarmed'],
      },
      {
        name: 'Claws',
        damageType: 'Slashing',
        damageDice: 'd6',
        traits: ['Agile', 'Unarmed'],
      },
    ],
    abilities: [
      // Condensed-form ability (initial)
      {
        name: 'Haunting Visage',
        actionCost: '1',
        level: 1,
        traits: ['Concentrate', 'Eidolon', 'Manipulate', 'Visual'],
      },
      // Dispersed-form ability (initial)
      {
        name: 'Swarming Assault',
        actionCost: '2',
        level: 1,
        traits: ['Eidolon'],
      },
      // Symbiosis reaction
      {
        name: 'Redistribute',
        actionCost: 'reaction',
        level: 7,
        traits: ['Eidolon'],
      },
      // Transcendence free action
      {
        name: 'Sickening Assault',
        actionCost: 'free',
        level: 17,
        traits: ['Concentrate', 'Eidolon'],
      },
    ],
    aonUrl: 'https://2e.aonprd.com/Eidolons.aspx?ID=13',
  },
};
