/**
 * AoN enrichment via the public Elasticsearch endpoint used by 2e.aonprd.com.
 * For personal use only — do not redistribute bulk AoN content.
 */

import type { ActionCost, CardCategory, CardModel } from '../model/cards';

const AON_ES = 'https://elasticsearch.aonprd.com/aon/_search';
const AON_BASE = 'https://2e.aonprd.com';
const BATCH_SIZE = 50;

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
} {
  if (!text) return { summary: fallback?.trim() || undefined };

  const parts = text.split(' --- ');
  const html = parts.length > 1 ? parts.slice(1).join(' --- ') : text;
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

  return result;
}

function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function mapActionCost(raw: string | undefined): ActionCost | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase().trim();
  if (s.includes('free')) return 'free';
  if (s.includes('reaction')) return 'reaction';
  if (s === '1' || s === 'one action') return '1';
  if (s === '2' || s === 'two actions') return '2';
  if (s === '3' || s === 'three actions') return '3';
  if (s.match(/1.*(to|or|[-–]).*3/) || s.includes('one to three')) return '1-3';
  if (s.match(/1.*(to|or|[-–]).*2/) || s.includes('one to two')) return '1-2';
  if (s.match(/2.*(to|or|[-–]).*3/) || s.includes('two to three')) return '2-3';
  if (s.includes(' to ') || s.includes('varies') || s.includes('variable')) return 'variable';
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

  // For each card, pick the best-typed result
  const result = new Map<string, AonData>();
  for (const card of cards) {
    if (result.has(card.title)) continue;
    const candidates = byName.get(card.title);
    if (!candidates || candidates.length === 0) continue;

    const preferred = preferredTypesFor(card.category);
    const best = candidates.find((c) => preferred.includes(c.aonType)) ?? candidates[0];
    result.set(card.title, best);
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
    rules.summary = data.description;
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
    const isActive = card.rules.actionCost !== undefined && card.rules.actionCost !== 'passive';
    if (isActive) {
      activeTitleToId.set(card.title.toLowerCase(), card.id);
    }
  }

  const merges: FeatMerge[] = [];

  for (const card of cards) {
    if (card.category !== 'feat-passive') continue;
    const aon = aonDataMap.get(card.title);
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
