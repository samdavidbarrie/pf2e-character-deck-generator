import { describe, expect, it } from 'vitest';
import { parsePathbuilder } from '../../import/pathbuilderAdapter';
import type { LinkedCreature } from '../../model/character';
import {
  generateCreatureActionCards,
  generateCreatureAttackCards,
  generateCreatureFaceCard,
  generateCreatureSkillCard,
} from './creatures';

// ---------------------------------------------------------------------------
// Minimal synthetic fixture helpers
// ---------------------------------------------------------------------------

function makeSummonerJson(overrides: Record<string, unknown> = {}): unknown {
  return {
    success: true,
    build: {
      name: 'Test Summoner',
      class: 'Summoner',
      level: 5,
      deity: 'Tonbarse',
      sizeName: 'Medium',
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 },
      attributes: { ancestryhp: 8, classhp: 10, bonushp: 0, speed: 25 },
      proficiencies: { classDC: 2, perception: 2, fortitude: 4, reflex: 2, will: 4 },
      feats: [],
      specials: [
        'Beast Eidolon',
        "Beast's Charge",
        'Manifest Eidolon',
        'Act Together',
        'Share Senses',
        'Survival',
        'Athletics',
        'Diplomacy', // granted via Skilled Partner
        'Primal Roar',
        'Eidolon Unarmed Expertise',
        'Shared Vigilance',
      ],
      lores: [],
      equipment: [],
      weapons: [],
      armor: [],
      spellCasters: [],
      focus: {},
      formula: [],
      acTotal: { acTotal: 20 },
      pets: [],
      familiars: [],
      ...overrides,
    },
  };
}

function makeEidolon(overrides: Partial<LinkedCreature> = {}): LinkedCreature {
  return {
    id: 'test-id',
    name: 'Tonbarse',
    kind: 'eidolon',
    subtype: 'Beast',
    traits: ['Eidolon', 'Beast'],
    hasFullStats: false,
    skills: [
      { skill: 'Athletics', rank: 'trained' },
      { skill: 'Survival', rank: 'trained' },
    ],
    actions: [
      { name: "Beast's Charge", actionCost: '2', traits: ['Eidolon'] },
      { name: 'Primal Roar', actionCost: '2', traits: ['Eidolon'] },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Creature detection from Pathbuilder JSON
// ---------------------------------------------------------------------------

describe('parsePathbuilder – eidolon detection', () => {
  it('detects a Beast Eidolon from Summoner specials', () => {
    const char = parsePathbuilder(makeSummonerJson());
    expect(char.linkedCreatures).toHaveLength(1);
    const eidolon = char.linkedCreatures![0];
    expect(eidolon.kind).toBe('eidolon');
    expect(eidolon.subtype).toBe('Beast');
  });

  it('uses the deity field as the eidolon name', () => {
    const char = parsePathbuilder(makeSummonerJson());
    expect(char.linkedCreatures![0].name).toBe('Tonbarse');
  });

  it('falls back to eidolon type string when deity is absent', () => {
    const json = makeSummonerJson({ deity: undefined });
    const char = parsePathbuilder(json);
    expect(char.linkedCreatures![0].name).toBe('Beast Eidolon');
  });

  it('extracts skill names from specials as eidolon skills', () => {
    const char = parsePathbuilder(makeSummonerJson());
    const eidolon = char.linkedCreatures![0];
    expect(eidolon.skills).toBeDefined();
    const skillNames = eidolon.skills!.map((s) => s.skill.toLowerCase());
    // Registry base skills for Beast Eidolon
    expect(skillNames).toContain('athletics');
    expect(skillNames).toContain('survival');
    // Specials-derived skills (from fixture)
    expect(skillNames).toContain('diplomacy');
  });

  it('populates traits from the registry (not just Eidolon + subtype)', () => {
    const char = parsePathbuilder(makeSummonerJson());
    const eidolon = char.linkedCreatures![0];
    expect(eidolon.traits).toContain('Eidolon');
    expect(eidolon.traits).toContain('Beast'); // from EIDOLON_REGISTRY.beast.extraTraits
  });

  it('populates senses from the registry', () => {
    const char = parsePathbuilder(makeSummonerJson());
    const eidolon = char.linkedCreatures![0];
    expect(eidolon.senses).toBeDefined();
    expect(eidolon.senses!).toContain('Darkvision');
  });

  it('uses registry abilities for known eidolon types (not just specials)', () => {
    const char = parsePathbuilder(makeSummonerJson());
    const eidolon = char.linkedCreatures![0];
    // Whirlwind Maul is level 17 — NOT in the fixture specials, but IS in registry
    const actionNames = eidolon.actions!.map((a) => a.name);
    expect(actionNames).toContain('Whirlwind Maul');
  });

  it('preserves correct actionCost for registry abilities', () => {
    const char = parsePathbuilder(makeSummonerJson());
    const eidolon = char.linkedCreatures![0];
    const charge = eidolon.actions!.find((a) => a.name === "Beast's Charge")!;
    expect(charge.actionCost).toBe('2');
  });

  it('extracts eidolon action names, filtering out summoner class features', () => {
    const char = parsePathbuilder(makeSummonerJson());
    const eidolon = char.linkedCreatures![0];
    expect(eidolon.actions).toBeDefined();
    const actionNames = eidolon.actions!.map((a) => a.name);
    // These are eidolon actions
    expect(actionNames).toContain("Beast's Charge");
    expect(actionNames).toContain('Primal Roar');
    // These are summoner class features and should be excluded
    expect(actionNames).not.toContain('Manifest Eidolon');
    expect(actionNames).not.toContain('Act Together');
    expect(actionNames).not.toContain('Share Senses');
    expect(actionNames).not.toContain('Shared Vigilance');
    expect(actionNames).not.toContain('Eidolon Unarmed Expertise');
    // Skill names should not be actions
    expect(actionNames).not.toContain('Survival');
    expect(actionNames).not.toContain('Athletics');
  });

  it('filters out feat names from eidolon actions (e.g. Versatile Human)', () => {
    const json = makeSummonerJson({
      specials: ['Beast Eidolon', "Beast's Charge", 'Manifest Eidolon', 'Versatile Human', 'Fleet'],
      feats: [
        ['Versatile Human', null, 'Heritage', 1],
        ['Fleet', null, 'General Feat', 1],
      ],
    });
    const char = parsePathbuilder(json);
    const actionNames = char.linkedCreatures![0].actions?.map((a) => a.name) ?? [];
    expect(actionNames).toContain("Beast's Charge");
    expect(actionNames).not.toContain('Versatile Human');
    expect(actionNames).not.toContain('Fleet');
  });

  it('looks up Beast Eidolon attacks (Jaws and Claw)', () => {
    const char = parsePathbuilder(makeSummonerJson());
    const eidolon = char.linkedCreatures![0];
    expect(eidolon.attacks).toBeDefined();
    const attackNames = eidolon.attacks!.map((a) => a.name);
    expect(attackNames).toContain('Jaws');
    expect(attackNames).toContain('Claw');
  });

  it('sets hasFullStats false for eidolon (no stats in Pathbuilder export)', () => {
    const char = parsePathbuilder(makeSummonerJson());
    expect(char.linkedCreatures![0].hasFullStats).toBe(false);
  });

  it('produces no linked creatures for non-Summoner classes', () => {
    const json = makeSummonerJson({ class: 'Monk' });
    const char = parsePathbuilder(json);
    expect(char.linkedCreatures ?? []).toHaveLength(0);
  });

  it('produces no eidolon if specials has no Eidolon type entry', () => {
    const json = makeSummonerJson({ specials: ['Act Together', 'Share Senses'] });
    const char = parsePathbuilder(json);
    expect(char.linkedCreatures ?? []).toHaveLength(0);
  });

  it('does not crash when pets and familiars are empty arrays', () => {
    expect(() => parsePathbuilder(makeSummonerJson())).not.toThrow();
  });

  it('parses the alase.json fixture without throwing', async () => {
    const fixture = await import('../../fixtures/alase.json');
    expect(() => parsePathbuilder(fixture)).not.toThrow();
    const char = parsePathbuilder(fixture);
    expect(char.linkedCreatures).toBeDefined();
    expect(char.linkedCreatures!.length).toBeGreaterThan(0);
    expect(char.linkedCreatures![0].kind).toBe('eidolon');
  });

  it('parses the vassora.json fixture (two animal companions) without throwing', async () => {
    const fixture = await import('../../fixtures/vassora.json');
    expect(() => parsePathbuilder(fixture)).not.toThrow();
    const char = parsePathbuilder(fixture);
    expect(char.linkedCreatures).toBeDefined();
    expect(char.linkedCreatures!.length).toBe(2);
    expect(char.linkedCreatures!.every((c) => c.kind === 'animal-companion')).toBe(true);
    const names = char.linkedCreatures!.map((c) => c.name);
    expect(names).toContain('Galador - Mature Bear');
    expect(names).toContain('Rusco - Mature Cat');
  });

  it('parses the nerri.json fixture (familiar) without throwing', async () => {
    const fixture = await import('../../fixtures/nerri.json');
    expect(() => parsePathbuilder(fixture)).not.toThrow();
    const char = parsePathbuilder(fixture);
    expect(char.linkedCreatures).toBeDefined();
    expect(char.linkedCreatures!.length).toBe(1);
    const familiar = char.linkedCreatures![0];
    expect(familiar.kind).toBe('familiar');
    expect(familiar.name).toBe('Familiar (Smudge)');
    expect(familiar.actions?.map((a) => a.name)).toEqual(
      expect.arrayContaining(['Speech', 'Flier', 'Skilled']),
    );
  });
});

// ---------------------------------------------------------------------------
// Face card generation
// ---------------------------------------------------------------------------

describe('generateCreatureFaceCard', () => {
  it('generates a card with the creature name as title', () => {
    const card = generateCreatureFaceCard(makeEidolon(), 0);
    expect(card.title).toBe('Tonbarse');
  });

  it('uses creature-summary category', () => {
    const card = generateCreatureFaceCard(makeEidolon(), 0);
    expect(card.category).toBe('creature-summary');
  });

  it('uses quadrant layout', () => {
    const card = generateCreatureFaceCard(makeEidolon(), 0);
    expect(card.layout).toBe('quadrant');
  });

  it('has no subtitle', () => {
    const card = generateCreatureFaceCard(makeEidolon(), 0);
    expect(card.subtitle).toBeUndefined();
  });

  it('includes creature traits', () => {
    const card = generateCreatureFaceCard(makeEidolon(), 0);
    expect(card.rules.traits).toContain('Eidolon');
    expect(card.rules.traits).toContain('Beast');
  });

  it('has HP and AC in correct quadrants', () => {
    const card = generateCreatureFaceCard(makeEidolon(), 0);
    const q1 = card.writableFields.filter((f) => f.quadrant === 1);
    const q2 = card.writableFields.filter((f) => f.quadrant === 2);
    expect(q1.map((f) => f.label)).toContain('Current HP');
    expect(q1.map((f) => f.label)).toContain('Max HP');
    expect(q2.map((f) => f.label)).toContain('AC');
    expect(q2.map((f) => f.label)).toContain('Speed (ft)');
  });

  it('has saves in Q3', () => {
    const card = generateCreatureFaceCard(makeEidolon(), 0);
    const q3 = card.writableFields.filter((f) => f.quadrant === 3);
    const labels = q3.map((f) => f.label);
    expect(labels).toContain('Fort');
    expect(labels).toContain('Ref');
    expect(labels).toContain('Will');
    expect(labels).toContain('Perception');
  });

  it('always includes Senses and Languages in Q4, as blank when unknown', () => {
    const card = generateCreatureFaceCard(
      makeEidolon({ senses: undefined, languages: undefined }),
      0,
    );
    const q4 = card.writableFields.filter((f) => f.quadrant === 4);
    const labels = q4.map((f) => f.label);
    expect(labels).toContain('Senses');
    expect(labels).toContain('Languages');
    const sensesField = q4.find((f) => f.label === 'Senses')!;
    expect(sensesField.type).toBe('blank');
  });

  it('shows Senses as display field when data is known', () => {
    const creature = makeEidolon({ senses: ['Darkvision', 'Scent 30 ft.'] });
    const card = generateCreatureFaceCard(creature, 0);
    const sensesField = card.writableFields.find((f) => f.label === 'Senses')!;
    expect(sensesField.type).toBe('display');
    expect(sensesField.value).toContain('Darkvision');
  });

  it('has a stable, deterministic stableKey', () => {
    const card1 = generateCreatureFaceCard(makeEidolon(), 0);
    const card2 = generateCreatureFaceCard(makeEidolon(), 0);
    expect(card1.stableKey).toBe(card2.stableKey);
    expect(card1.stableKey).toContain('tonbarse');
  });
});

// ---------------------------------------------------------------------------
// Skill card generation
// ---------------------------------------------------------------------------

describe('generateCreatureSkillCard', () => {
  it('returns null when creature is a familiar with no skills', () => {
    const familiar: LinkedCreature = { ...makeEidolon(), kind: 'familiar', skills: undefined };
    const card = generateCreatureSkillCard(familiar, 10);
    expect(card).toBeNull();
  });

  it('always generates a skill card for eidolons even with no skills data', () => {
    const card = generateCreatureSkillCard(makeEidolon({ skills: undefined }), 10);
    expect(card).not.toBeNull();
  });

  it('shows all 16 standard skills', () => {
    const card = generateCreatureSkillCard(makeEidolon(), 10);
    expect(card!.writableFields).toHaveLength(16);
  });

  it('marks known trained skills as trained', () => {
    const card = generateCreatureSkillCard(makeEidolon(), 10);
    const athleticsField = card!.writableFields.find((f) => f.label === 'Athletics')!;
    const acrobaticsField = card!.writableFields.find((f) => f.label === 'Acrobatics')!;
    expect(athleticsField.rank).toBe('trained');
    expect(acrobaticsField.rank).toBe('untrained');
  });

  it('has no traits on the skills card', () => {
    const card = generateCreatureSkillCard(makeEidolon(), 10);
    expect(card!.rules.traits).toHaveLength(0);
  });

  it('uses creature-skill category', () => {
    const card = generateCreatureSkillCard(makeEidolon(), 10);
    expect(card!.category).toBe('creature-skill');
  });

  it('includes the creature name in the title', () => {
    const card = generateCreatureSkillCard(makeEidolon(), 10);
    expect(card!.title).toContain('Tonbarse');
  });
});

// ---------------------------------------------------------------------------
// Attack card generation
// ---------------------------------------------------------------------------

describe('generateCreatureAttackCards', () => {
  const creatureWithAttacks = makeEidolon({
    attacks: [
      {
        name: 'Claw',
        traits: ['Agile', 'Finesse'],
        damageDice: '2d6',
        damageType: 'S',
        isUnarmed: true,
      },
      {
        name: 'Bite',
        traits: ['Fatal d10'],
        damageDice: '2d8',
        damageType: 'P',
        isUnarmed: true,
      },
    ],
  });

  it('returns empty array when no attacks', () => {
    const cards = generateCreatureAttackCards(makeEidolon({ attacks: undefined }), 20);
    expect(cards).toHaveLength(0);
  });

  it('generates one card per attack', () => {
    const cards = generateCreatureAttackCards(creatureWithAttacks, 20);
    expect(cards).toHaveLength(2);
  });

  it('uses creature-attack category', () => {
    const cards = generateCreatureAttackCards(creatureWithAttacks, 20);
    expect(cards[0].category).toBe('creature-attack');
  });

  it('has no subtitle — creature name is not repeated below the title', () => {
    const cards = generateCreatureAttackCards(creatureWithAttacks, 20);
    expect(cards[0].subtitle).toBeUndefined();
  });

  it('sets an AoN search URL on the source', () => {
    const cards = generateCreatureAttackCards(creatureWithAttacks, 20);
    expect(cards[0].source.aonUrl).toBeDefined();
    expect(cards[0].source.aonUrl).toContain('Claw');
  });

  it('includes attack traits and adds Attack trait', () => {
    const cards = generateCreatureAttackCards(creatureWithAttacks, 20);
    expect(cards[0].rules.traits).toContain('Agile');
    expect(cards[0].rules.traits).toContain('Attack');
  });

  it('summary contains damage dice and type', () => {
    const cards = generateCreatureAttackCards(creatureWithAttacks, 20);
    expect(cards[0].rules.summary).toContain('2d6');
    expect(cards[0].rules.summary).toContain('S');
  });

  it('primary eidolon attack (no damageDice, only Unarmed trait) shows 4 option choices', () => {
    const primary = makeEidolon({
      attacks: [{ name: 'Jaws', traits: ['Unarmed'], damageType: 'Piercing', isUnarmed: true }],
    });
    const cards = generateCreatureAttackCards(primary, 20);
    expect(cards[0].rules.summary).toContain('Choose ONE primary attack option');
    expect(cards[0].rules.summary).toContain('1d8');
    expect(cards[0].rules.summary).toContain('fatal d10');
    expect(cards[0].rules.summary).toContain('Piercing'); // damage type shown
  });

  it('secondary eidolon attack (d6 + Agile + Finesse + isUnarmed) shows fixed stats', () => {
    const secondary = makeEidolon({
      attacks: [
        {
          name: 'Claw',
          traits: ['Agile', 'Finesse', 'Unarmed'],
          damageDice: 'd6',
          damageType: 'Slashing',
          isUnarmed: true,
        },
      ],
    });
    const cards = generateCreatureAttackCards(secondary, 20);
    expect(cards[0].rules.summary).toContain('d6'); // die size only, count filled by player
    expect(cards[0].rules.summary).toContain('Slashing');
    // Agile and Finesse appear as trait pills (rules.traits), not in the summary text
    expect(cards[0].rules.traits).toContain('Agile');
    expect(cards[0].rules.traits).toContain('Finesse');
    expect(cards[0].rules.summary).not.toContain('Choose');
  });

  it('Beast Eidolon from registry has Jaws as primary and Claw as secondary', async () => {
    const fixture = await import('../../fixtures/alase.json');
    const char = parsePathbuilder(fixture);
    const eidolon = char.linkedCreatures![0];
    const attacks = eidolon.attacks!;
    const jaws = attacks.find((a) => a.name === 'Jaws')!;
    const claw = attacks.find((a) => a.name === 'Claw')!;
    // Jaws is primary: no damageDice, only Unarmed trait
    expect(jaws.damageDice).toBeUndefined();
    expect(jaws.traits).toEqual(['Unarmed']);
    // Claw is secondary: d6, Agile, Finesse
    expect(claw.damageDice).toBe('d6');
    expect(claw.traits).toContain('Agile');
    expect(claw.traits).toContain('Finesse');
  });
});

// ---------------------------------------------------------------------------
// Action card generation
// ---------------------------------------------------------------------------

describe('generateCreatureActionCards', () => {
  it('returns empty array when no actions', () => {
    const cards = generateCreatureActionCards(makeEidolon({ actions: undefined }), 40);
    expect(cards).toHaveLength(0);
  });

  it('generates one card per action', () => {
    const cards = generateCreatureActionCards(makeEidolon(), 40);
    expect(cards).toHaveLength(2);
  });

  it('uses creature-action category', () => {
    const cards = generateCreatureActionCards(makeEidolon(), 40);
    expect(cards[0].category).toBe('creature-action');
  });

  it('uses action name as title with no subtitle', () => {
    const cards = generateCreatureActionCards(makeEidolon(), 40);
    const chargeCard = cards.find((c) => c.title === "Beast's Charge");
    expect(chargeCard).toBeDefined();
    expect(chargeCard!.subtitle).toBeUndefined();
  });

  it('sets an AoN search URL on the source', () => {
    const cards = generateCreatureActionCards(makeEidolon(), 40);
    expect(cards[0].source.aonUrl).toBeDefined();
  });

  it('maps actionCost string to ActionCost type', () => {
    const cards = generateCreatureActionCards(makeEidolon(), 40);
    expect(cards[0].rules.actionCost).toBe('2');
  });

  it('includes action traits on the card', () => {
    const cards = generateCreatureActionCards(makeEidolon(), 40);
    expect(cards[0].rules.traits).toContain('Eidolon');
  });

  it('has a notes field for actions with an action cost', () => {
    const cards = generateCreatureActionCards(makeEidolon(), 40);
    const notesField = cards[0].writableFields.find((f) => f.type === 'notes');
    expect(notesField).toBeDefined();
  });
});
