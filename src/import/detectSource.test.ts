import { describe, expect, it } from 'vitest';
import { detectSource } from './detectSource';

describe('detectSource', () => {
  it('identifies a Pathbuilder export by the build key', () => {
    expect(detectSource({ build: { name: 'Hikari', level: 11 } })).toBe('pathbuilder');
  });

  it('returns unknown for an empty object', () => {
    expect(detectSource({})).toBe('unknown');
  });

  it('returns unknown for null', () => {
    expect(detectSource(null)).toBe('unknown');
  });

  it('returns unknown for a non-object', () => {
    expect(detectSource('hello')).toBe('unknown');
    expect(detectSource(42)).toBe('unknown');
  });

  it('returns unknown when the build key is absent', () => {
    expect(detectSource({ character: {}, cards: [] })).toBe('unknown');
  });
});
