import type { ActionCost, CardModel } from '../../model/cards';
import type { CharacterModel, CharacterSpell } from '../../model/character';
import { aonSearchUrl } from '../../rules/aonUrlResolver';
import { buildStableKey } from '../../rules/nameNormalization';
import { blankField, defaultCard } from './_helpers';

/** Map a raw Pathbuilder cast/actions string to a typed ActionCost. */
function mapCastCost(raw: string | undefined): ActionCost | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase().trim();
  if (s.includes('free')) return 'free';
  if (s.includes('reaction')) return 'reaction';
  const isOne = (t: string) => t === '1' || t.includes('one') || t.includes('single');
  const isTwo = (t: string) => t === '2' || t.includes('two');
  const isThree = (t: string) => t === '3' || t.includes('three');
  if (isOne(s) && isThree(s)) return '1-3';
  if (isOne(s) && isTwo(s)) return '1-2';
  if (isTwo(s) && isThree(s)) return '2-3';
  if (
    s === '1' ||
    s.startsWith('one ') ||
    s.startsWith('1 ') ||
    s === 'one' ||
    s.startsWith('single')
  )
    return '1';
  if (s === '2' || s.startsWith('two ') || s.startsWith('2 ') || s === 'two') return '2';
  if (s === '3' || s.startsWith('three ') || s.startsWith('3 ') || s === 'three') return '3';
  return undefined;
}

function buildSpellCard(spell: CharacterSpell, isFocus: boolean): CardModel {
  const category = isFocus ? 'focus-spell' : 'spell';
  const stableKey = isFocus
    ? buildStableKey('focus-spell', spell.name)
    : buildStableKey('spell', spell.tradition ?? 'unknown', `rank-${spell.rank}`, spell.name);

  // Include the tradition as a trait so the card tab colour works without
  // relying on a subtitle. Capitalise to match AoN trait casing.
  // Filter out synthetic Pathbuilder values like "Unassigned" that aren't real
  // PF2e tradition names.
  const REAL_TRADITIONS = new Set(['arcane', 'divine', 'occult', 'primal']);
  const traditionTrait =
    spell.tradition && REAL_TRADITIONS.has(spell.tradition.toLowerCase())
      ? spell.tradition.charAt(0).toUpperCase() + spell.tradition.slice(1)
      : null;

  // Rank-0 non-focus spells are always cantrips.
  // Focus cantrips are focus spells with focusCost === 0.
  // Focus spells with focusCost >= 1 are NOT cantrips even though their rank is 0.
  const spellIsCantrip =
    (!isFocus && spell.rank === 0) || (isFocus && (spell.focusCost ?? 1) === 0);
  const hasCantripTrait = spell.traits.some((t) => t.toLowerCase() === 'cantrip');
  const extraTraits = [
    ...(traditionTrait ? [traditionTrait] : []),
    ...(spellIsCantrip && !hasCantripTrait ? ['Cantrip'] : []),
  ];
  const traits = [...spell.traits, ...extraTraits];

  return defaultCard({
    title: spell.name,
    category,
    stableKey,
    source: {
      system: 'generated',
      originalName: spell.name,
      aonUrl: aonSearchUrl(spell.name),
    },
    rules: {
      actionCost: mapCastCost(spell.actionCost),
      traits,
      rank: spell.rank,
      summary:
        spell.summary ??
        'Rules summary not imported. Add a short table-facing summary or use the source link.',
      // Pre-fill spell meta from Pathbuilder if available; enrichment will fill the rest
      range: spell.range,
      area: spell.area,
      targets: spell.targets,
      defense: spell.defense,
      duration: spell.duration,
    },
    print: { include: true, priority: isFocus ? 42 : 40, size: 'standard' },
    writableFields: [blankField('Spell DC', 'sm'), blankField('Spell Attack', 'sm')],
  });
}

export function generateSpellCards(char: CharacterModel): CardModel[] {
  return char.spells.map((s) => buildSpellCard(s, false));
}

export function generateFocusSpellCards(char: CharacterModel): CardModel[] {
  const cards = char.focusSpells.map((s) => buildSpellCard(s, true));

  if (char.focusSpells.length > 0) {
    // Refocus reminder card
    cards.push(
      defaultCard({
        title: 'Refocus',
        subtitle: 'Restore Focus Points',
        category: 'reminder',
        stableKey: buildStableKey('reminder', 'refocus'),
        rules: {
          actionCost: 'variable',
          traits: ['concentrate'],
          summary:
            'Spend 10 minutes performing activities intrinsic to your magical tradition to regain 1 Focus Point (up to your max).',
        },
        print: { include: true, priority: 43, size: 'standard' },
        writableFields: [blankField(`Focus Pool (max ${char.focusPoints ?? 1})`, 'sm')],
      }),
    );
  }

  return cards;
}
