/**
 * AoN enrichment via the public Elasticsearch endpoint used by 2e.aonprd.com.
 * For personal use only — do not redistribute bulk AoN content.
 */

import type { ActionCost, CardCategory, CardModel } from '../model/cards';

const AON_ES = 'https://elasticsearch.aonprd.com/aon/_search';
const AON_BASE = 'https://2e.aonprd.com';
const BATCH_SIZE = 50;

/**
 * When false (the default), all direct AoN Elasticsearch calls are skipped.
 * Set VITE_ENABLE_AON_LIVE_SEARCH=true in your local .env to enable live enrichment.
 */
export const ENABLE_AON_LIVE_SEARCH = import.meta.env.VITE_ENABLE_AON_LIVE_SEARCH === 'true';

export const SUMMARY_PLACEHOLDER = 'Rules summary not imported.';

// ---------------------------------------------------------------------------
// AoN data shape
// ---------------------------------------------------------------------------

export interface AonData {
  name: string;
  aonType: string;
  description?: string;
  traits: string[];
  actionCost?: ActionCost;
  range?: string;
  area?: string;
  targets?: string;
  savingThrow?: string;
  duration?: string;
  trigger?: string;
  requirements?: string;
  frequency?: string;
  level?: number;
  prerequisite?: string;
  url?: string;
  // Degree-of-success outcomes
  criticalSuccess?: string;
  success?: string;
  failure?: string;
  criticalFailure?: string;
  /** Heightened text extracted from the AoN text field (e.g. "(6th) You can target up to 10 creatures."). */
  heightened?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse the AoN `text` field into a preamble summary plus the four
 * degree-of-success outcome sections.
 * AoN stores outcomes as plain text ("Critical Success You knock...") with no
 * HTML markers, so we strip HTML first then split on the keyword boundaries.
 */
function parseFullRulesHtml(
  text: string | undefined,
  fallback: string | undefined,
): {
  summary?: string;
  criticalSuccess?: string;
  success?: string;
  failure?: string;
  criticalFailure?: string;
  heightened?: string;
} {
  if (!text) return { summary: fallback?.trim() || undefined };

  // AoN text format: "metadata --- description+outcomes --- Heightened (Nth) ..."
  // parts[0] = metadata, parts[1] = description+outcomes, parts[2+] = heightened entries
  const parts = text.split(' --- ');

  // Separate the content (description+outcomes) from any trailing heightened sections
  const contentParts: string[] = [];
  const heightenedParts: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    if (/^Heightened\b/i.test(parts[i].trimStart())) {
      heightenedParts.push(parts[i].trim());
    } else if (heightenedParts.length === 0) {
      contentParts.push(parts[i]);
    } else {
      // continuation of heightened block
      heightenedParts.push(parts[i].trim());
    }
  }

  const html = contentParts.length > 0 ? contentParts.join(' --- ') : text;
  const plain = stripHtml(html).trim();

  // Split on outcome keyword boundaries. Critical variants must come before
  // plain Success/Failure in the alternation to avoid partial matching.
  const segments = plain.split(/\b(Critical Failure|Critical Success|Success|Failure)\b/);

  // segments: [preamble, label, content, label, content, ...]
  const result: {
    summary?: string;
    criticalSuccess?: string;
    success?: string;
    failure?: string;
    criticalFailure?: string;
    heightened?: string;
  } = {};

  result.summary = segments[0]?.trim() || fallback?.trim() || undefined;

  for (let i = 1; i < segments.length; i += 2) {
    const label = segments[i];
    const content = segments[i + 1]?.trim() || undefined;
    if (!content) continue;
    if (label === 'Critical Success') result.criticalSuccess = content;
    else if (label === 'Critical Failure') result.criticalFailure = content;
    else if (label === 'Success') result.success = content;
    else if (label === 'Failure') result.failure = content;
  }

  if (heightenedParts.length > 0) {
    result.heightened = heightenedParts.join('\n').trim();
  }

  return result;
}

function stripHtml(html: string): string {
  return (
    html
      .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      // Preserve hyperlinks and bold tags as **text** markers
      .replace(
        /<(?:a|b|strong)\b[^>]*>(.*?)<\/(?:a|b|strong)>/gis,
        (_, inner) => `**${inner.replace(/<[^>]+>/g, '')}**`,
      )
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/\n{3,}/g, '\n\n')
      // Collapse adjacent bold markers for the same word (e.g. **foo****bar** → **foobar**)
      .replace(/\*\*\*\*/g, '')
      .trim()
  );
}

/**
 * Remove AoN source/price/bulk metadata that gets embedded in item description text.
 * E.g. "… Source GM Core pg. 236 Price 450 gp Bulk L ---"
 */
function stripSourceMetadata(text: string): string {
  return (
    text
      // Remove "Source …" trailing reference blocks
      .replace(/\s+Source\s+[A-Z][\w ',]+pg\.\s*\d+.*$/s, '')
      // Remove any remaining "Price X gp" / "Bulk …" artifacts
      .replace(/\s+Price\s+[\d,]+\s*(?:gp|sp|cp)[^.]*\./s, '.')
      .replace(/\s+Bulk\s+\S+\s*---.*$/s, '')
      .trim()
  );
}

function mapActionCost(raw: string | undefined): ActionCost | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase().trim();
  if (s.includes('free')) return 'free';
  if (s.includes('reaction')) return 'reaction';
  // Range patterns must come before single-digit patterns
  // AoN can return "Single Action to Three Actions", "1 to 3", "One to Three", etc.
  const isOne = (t: string) => t === '1' || t.includes('one') || t.includes('single');
  const isTwo = (t: string) => t === '2' || t.includes('two');
  const isThree = (t: string) => t === '3' || t.includes('three');
  if (isOne(s) && isThree(s)) return '1-3';
  if (isOne(s) && isTwo(s)) return '1-2';
  if (isTwo(s) && isThree(s)) return '2-3';
  if (s.includes(' to ') || s.includes('varies') || s.includes('variable')) return 'variable';
  // Single cost — match bare digit or word
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
  if (s === 'passive' || s === 'none' || s === '') return 'passive';
  return undefined;
}

// Prefer certain AoN document types per card category (AoN returns capitalized types)
function preferredTypesFor(category: CardCategory): string[] {
  switch (category) {
    case 'spell':
      return ['Spell', 'Cantrip'];
    case 'focus-spell':
      return ['Focus', 'Spell'];
    case 'feat-action':
    case 'feat-passive':
    case 'reaction':
    case 'free-action':
      return ['Feat', 'Action'];
    case 'basic-action':
    case 'skill-action':
      return ['Action', 'Feat'];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchBatch(names: string[]): Promise<AonData[]> {
  const body = {
    query: {
      bool: {
        should: names.map((name) => ({ term: { 'name.keyword': name } })),
        minimum_should_match: 1,
      },
    },
    _source: [
      'name',
      'type',
      'text',
      'summary',
      'trait',
      'actions',
      'range',
      'area',
      'target',
      'saving_throw',
      'duration',
      'trigger',
      'requirement',
      'frequency',
      'level',
      'prerequisite',
      'url',
    ],
    size: Math.min(names.length * 3, 200),
  };

  const res = await fetch(AON_ES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`AoN API responded with ${res.status}`);

  const json = (await res.json()) as {
    hits?: { hits?: Array<{ _source: Record<string, unknown> }> };
  };

  return (json.hits?.hits ?? []).map((hit) => {
    const s = hit._source;
    const rawUrl = s['url'] as string | undefined;
    const parsed = parseFullRulesHtml(
      s['text'] as string | undefined,
      s['summary'] as string | undefined,
    );
    return {
      name: s['name'] as string,
      aonType: (s['type'] as string) ?? '',
      description: parsed.summary,
      criticalSuccess: parsed.criticalSuccess,
      success: parsed.success,
      failure: parsed.failure,
      criticalFailure: parsed.criticalFailure,
      heightened: parsed.heightened,
      traits: (s['trait'] as string[]) ?? [],
      actionCost: mapActionCost(s['actions'] as string | undefined),
      range: s['range'] as string | undefined,
      area: s['area'] as string | undefined,
      targets: s['target'] as string | undefined,
      savingThrow: s['saving_throw'] as string | undefined,
      duration: s['duration'] as string | undefined,
      trigger: s['trigger'] as string | undefined,
      requirements: s['requirement'] as string | undefined,
      frequency: s['frequency'] as string | undefined,
      level: s['level'] as number | undefined,
      prerequisite: s['prerequisite'] as string | undefined,
      url: rawUrl ? `${AON_BASE}${rawUrl}` : undefined,
    };
  });
}

/**
 * Fetch AoN data for a list of names. Returns a map keyed by name,
 * preferring results that best match each card's category where there are
 * multiple hits for the same name (e.g. "Shield" is both a spell and an action).
 */
export async function fetchAonData(
  cards: Array<{ title: string; category: CardCategory }>,
): Promise<Map<string, AonData>> {
  if (!ENABLE_AON_LIVE_SEARCH) return new Map();

  const names = [...new Set(cards.map((c) => c.title).filter(Boolean))];
  const allResults: AonData[] = [];

  for (let i = 0; i < names.length; i += BATCH_SIZE) {
    const batch = names.slice(i, i + BATCH_SIZE);
    const entries = await fetchBatch(batch);
    allResults.push(...entries);
  }

  // Group by name, then pick the best match per card
  const byName = new Map<string, AonData[]>();
  for (const entry of allResults) {
    const existing = byName.get(entry.name) ?? [];
    byName.set(entry.name, [...existing, entry]);
  }

  // For each card, pick the best-typed result.
  // Key by "category:title" so that a name shared across categories (e.g. "Perfect
  // Strike" as both a feat and a focus spell) each gets its own correctly-typed entry.
  const result = new Map<string, AonData>();
  for (const card of cards) {
    const key = `${card.category}:${card.title}`;
    if (result.has(key)) continue;
    const candidates = byName.get(card.title);
    if (!candidates || candidates.length === 0) continue;

    const preferred = preferredTypesFor(card.category);
    const best = candidates.find((c) => preferred.includes(c.aonType)) ?? candidates[0];
    result.set(key, best);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Apply enrichment to a single card
// ---------------------------------------------------------------------------

export function applyAonDataToCard(card: CardModel, data: AonData): CardModel {
  if (card.userEdits.edited) return card;

  const rules = { ...card.rules };
  const source = { ...card.source };

  // For basic/skill actions the template provides a short one-liner; always
  // replace it with the fuller AoN description so roll/DC text is visible.
  const alwaysReplace = card.category === 'basic-action' || card.category === 'skill-action';

  if (data.description && (rules.summary.startsWith(SUMMARY_PLACEHOLDER) || alwaysReplace)) {
    const isItem = card.category === 'equipment' || card.category === 'weapon';
    let desc = isItem ? stripSourceMetadata(data.description) : data.description;
    rules.summary = desc;
  }

  // For spells: attach Heightened text as an extraSection (parsed separately by fetchBatch)
  const isSpell = card.category === 'spell' || card.category === 'focus-spell';
  if (isSpell && data.heightened && !rules.extraSections?.length) {
    const heightenedText = data.heightened.replace(/\bHeightened\b\s+/g, 'Heightened ').trim();
    if (heightenedText) {
      rules.extraSections = [
        ...(rules.extraSections ?? []),
        { heading: 'Heightened', body: heightenedText },
      ];
    }
  }

  // Degree-of-success outcomes — always apply if AoN has them
  if (data.criticalSuccess && !rules.criticalSuccess) rules.criticalSuccess = data.criticalSuccess;
  if (data.success && !rules.success) rules.success = data.success;
  if (data.failure && !rules.failure) rules.failure = data.failure;
  if (data.criticalFailure && !rules.criticalFailure) rules.criticalFailure = data.criticalFailure;

  if (data.traits.length > 0 && rules.traits.length === 0) {
    rules.traits = data.traits;
  }

  if (data.actionCost && !rules.actionCost) {
    rules.actionCost = data.actionCost;
  }

  if (data.trigger && !rules.trigger) rules.trigger = data.trigger;
  if (data.requirements && !rules.requirements) rules.requirements = data.requirements;
  if (data.frequency && !rules.frequency) rules.frequency = data.frequency;

  // Spell targeting / meta fields
  if (data.range && !rules.range) {
    const r = String(data.range).trim();
    if (/^\d+$/.test(r)) {
      // AoN encodes "planetary" as 10,000,000 and potentially other sentinel values
      rules.range = parseInt(r, 10) >= 1_000_000 ? 'planetary' : `${r} ft.`;
    } else {
      rules.range = r;
    }
  }
  if (data.area && !rules.area) rules.area = String(data.area).trim();
  if (data.targets && !rules.targets) rules.targets = String(data.targets).trim();
  if (data.savingThrow && !rules.defense)
    rules.defense = String(data.savingThrow).replace(/\s+/g, ' ').trim();
  if (data.duration && !rules.duration) rules.duration = String(data.duration).trim();

  // Detect spell-attack spells from description text (they target AC, not a save)
  if (!rules.spellAttack && (card.category === 'spell' || card.category === 'focus-spell')) {
    const desc = (data.description ?? '').toLowerCase();
    if (desc.includes('spell attack roll') || desc.includes('make a spell attack')) {
      rules.spellAttack = true;
    }
  }

  if (data.url) source.aonUrl = data.url;

  return { ...card, rules, source };
}

// ---------------------------------------------------------------------------
// Passive feat → active card merge detection
// ---------------------------------------------------------------------------

export interface FeatMerge {
  parentId: string;
  childId: string;
}

/**
 * For each passive feat whose AoN prerequisite names an active card in the
 * deck, pair them up so the passive feat can be merged onto the parent card.
 */
export function detectFeatMerges(
  cards: CardModel[],
  aonDataMap: Map<string, AonData>,
): FeatMerge[] {
  // Build index of active-ability card titles → id
  const activeTitleToId = new Map<string, string>();
  for (const card of cards) {
    if (card.continuationOf) continue; // back cards are never merge targets
    const isActive = card.rules.actionCost !== undefined && card.rules.actionCost !== 'passive';
    if (isActive) {
      activeTitleToId.set(card.title.toLowerCase(), card.id);
    }
  }

  const merges: FeatMerge[] = [];

  for (const card of cards) {
    if (card.category !== 'feat-passive') continue;
    const aon = aonDataMap.get(`${card.category}:${card.title}`);
    if (!aon?.prerequisite) continue;

    const prereqLower = aon.prerequisite.toLowerCase();
    for (const [titleLower, parentId] of activeTitleToId) {
      if (prereqLower.includes(titleLower)) {
        merges.push({ parentId, childId: card.id });
        break;
      }
    }
  }

  return merges;
}

// ---------------------------------------------------------------------------
// Weapon property rune enrichment
// ---------------------------------------------------------------------------

/**
 * Fetch descriptions for all unique property rune names found across weapon cards.
 * Returns a map of rune name → description text.
 */
export async function fetchRuneDescriptions(cards: CardModel[]): Promise<Map<string, string>> {
  if (!ENABLE_AON_LIVE_SEARCH) return new Map();

  const runeNames = new Set<string>();
  for (const card of cards) {
    if (card.category === 'weapon' && !card.continuationOf) {
      for (const rune of card.source.runes ?? []) {
        runeNames.add(rune);
      }
    }
  }
  if (runeNames.size === 0) return new Map();

  const names = [...runeNames];
  const body = {
    query: {
      bool: {
        should: names.map((name) => ({ term: { 'name.keyword': name } })),
        minimum_should_match: 1,
      },
    },
    _source: ['name', 'type', 'text', 'summary'],
    size: names.length * 4,
  };

  const res = await fetch(AON_ES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`AoN rune fetch responded with ${res.status}`);

  const json = (await res.json()) as {
    hits?: { hits?: Array<{ _source: Record<string, unknown> }> };
  };

  const map = new Map<string, string>();
  for (const hit of json.hits?.hits ?? []) {
    const s = hit._source;
    const name = s['name'] as string;
    const type = (s['type'] as string | undefined)?.toLowerCase() ?? '';
    // Prefer "rune" or "equipment" type results
    if (!map.has(name) || type.includes('rune') || type.includes('equipment')) {
      const parsed = parseFullRulesHtml(
        s['text'] as string | undefined,
        s['summary'] as string | undefined,
      );
      if (parsed.summary) map.set(name, parsed.summary);
    }
  }

  return map;
}

/**
 * Apply fetched rune descriptions to dedicated rune cards (title = "X Rune",
 * source.runes = ['X'], summary still at placeholder).
 */
export function applyRuneDescriptions(card: CardModel, runeMap: Map<string, string>): CardModel {
  const runes = card.source.runes ?? [];
  if (
    card.category !== 'weapon' ||
    card.continuationOf ||
    runes.length !== 1 ||
    card.rules.summary !== SUMMARY_PLACEHOLDER
  ) {
    return card;
  }

  const rawDesc = runeMap.get(runes[0]);
  if (!rawDesc) return card;

  const cleaned = stripSourceMetadata(rawDesc);
  return { ...card, rules: { ...card.rules, summary: cleaned } };
}
