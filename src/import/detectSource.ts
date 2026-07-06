export type SourceType = 'pathbuilder' | 'unknown';

function hasPath(obj: unknown, key: string): boolean {
  return typeof obj === 'object' && obj !== null && key in (obj as Record<string, unknown>);
}

export function detectSource(json: unknown): SourceType {
  if (hasPath(json, 'build')) return 'pathbuilder';
  return 'unknown';
}
