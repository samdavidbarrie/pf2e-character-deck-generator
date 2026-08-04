/**
 * Stable key normalization.
 * Keys must be deterministic across re-imports and case/whitespace variations.
 */
export function normalizeKeySegment(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/['']/g, '') // curly quotes
    .replace(/[^a-z0-9\s-]/g, '') // strip punctuation
    .replace(/\s+/g, '-');
}

export function buildStableKey(category: string, ...parts: string[]): string {
  const segments = [category, ...parts].map(normalizeKeySegment).filter(Boolean);
  return segments.join(':');
}

/**
 * Convert a raw variable action cost string (from Pathbuilder or AoN) into a
 * compact symbol form suitable for the variableActionCost display field.
 * Returns undefined for vague strings like "varies" or "variable" that carry
 * no useful range information.
 *
 * Examples:
 *   "Single Action to Three Actions" → "◆ to ◆◆◆"
 *   "1 to 3"                         → "◆ to ◆◆◆"
 *   "Two Actions to Three Actions"   → "◆◆ to ◆◆◆"
 *   "varies"                         → undefined
 */
export function formatVariableActionCost(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase().trim();
  if (lower === 'varies' || lower === 'variable') return undefined;

  const result = raw
    // Multi-word forms first (longest match)
    .replace(/\bthree\s+actions?\b/gi, '◆◆◆')
    .replace(/\btwo\s+actions?\b/gi, '◆◆')
    .replace(/\b(?:one|single)\s+actions?\b/gi, '◆')
    .replace(/\bfree\s+actions?\b/gi, '◇')
    .replace(/\breaction\b/gi, '↺')
    // Bare words
    .replace(/\bthree\b/gi, '◆◆◆')
    .replace(/\btwo\b/gi, '◆◆')
    .replace(/\b(?:one|single)\b/gi, '◆')
    .replace(/\bfree\b/gi, '◇')
    // Bare digits
    .replace(/\b3\b/g, '◆◆◆')
    .replace(/\b2\b/g, '◆◆')
    .replace(/\b1\b/g, '◆')
    // Normalise separators to "to"
    .replace(/\s*[-–—]\s*/g, ' to ')
    .replace(/\s+/g, ' ')
    .trim();

  return result || undefined;
}
