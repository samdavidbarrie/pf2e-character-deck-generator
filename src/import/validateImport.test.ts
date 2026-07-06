import { describe, expect, it } from 'vitest';
import { validateImport } from './validateImport';

const minimalBuild = {
  build: {
    name: 'Test Character',
    level: 5,
    class: 'Fighter',
    feats: [['Power Attack', '', 'Class Feat', 1, '']],
    spellCasters: [{ name: 'Arcane', spells: [] }],
    equipment: [['Longsword', 1]],
  },
};

describe('validateImport', () => {
  it('accepts a minimal valid Pathbuilder export', () => {
    const result = validateImport(minimalBuild);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.source).toBe('pathbuilder');
  });

  it('rejects null', () => {
    const result = validateImport(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects a plain string', () => {
    const result = validateImport('not an object');
    expect(result.valid).toBe(false);
  });

  it('rejects an object without the build key', () => {
    const result = validateImport({ character: 'someone' });
    expect(result.valid).toBe(false);
    expect(result.source).toBe('unknown');
  });

  it('errors when character name is missing', () => {
    const input = { build: { ...minimalBuild.build, name: undefined } };
    const result = validateImport(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('name'))).toBe(true);
  });

  it('errors when level is missing', () => {
    const input = { build: { ...minimalBuild.build, level: undefined } };
    const result = validateImport(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('level'))).toBe(true);
  });

  it('warns when class is missing', () => {
    const input = { build: { ...minimalBuild.build, class: undefined } };
    const result = validateImport(input);
    expect(result.valid).toBe(true); // warning, not error
    expect(result.warnings.some((w) => w.toLowerCase().includes('class'))).toBe(true);
  });

  it('warns when feats array is empty', () => {
    const input = { build: { ...minimalBuild.build, feats: [] } };
    const result = validateImport(input);
    expect(result.warnings.some((w) => w.toLowerCase().includes('feat'))).toBe(true);
  });

  it('warns when spellCasters array is empty', () => {
    const input = { build: { ...minimalBuild.build, spellCasters: [] } };
    const result = validateImport(input);
    expect(result.warnings.some((w) => w.toLowerCase().includes('spell'))).toBe(true);
  });
});
