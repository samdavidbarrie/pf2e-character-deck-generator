/**
 * Stable key normalization.
 * Keys must be deterministic across re-imports and case/whitespace variations.
 */
export function normalizeKeySegment(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")        // curly quotes
    .replace(/[^a-z0-9\s-]/g, "") // strip punctuation
    .replace(/\s+/g, "-");
}

export function buildStableKey(category: string, ...parts: string[]): string {
  const segments = [category, ...parts].map(normalizeKeySegment).filter(Boolean);
  return segments.join(":");
}
