import { describe, expect, it } from 'vitest';
import { isPathbuilderId } from './detectPathbuilderId';

describe('isPathbuilderId', () => {
  it('returns true for a plain numeric string', () => {
    expect(isPathbuilderId('422538')).toBe(true);
  });

  it('returns true when surrounded by whitespace', () => {
    expect(isPathbuilderId('  422538  ')).toBe(true);
  });

  it('returns true for a single digit', () => {
    expect(isPathbuilderId('1')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isPathbuilderId('')).toBe(false);
  });

  it('returns false for whitespace only', () => {
    expect(isPathbuilderId('   ')).toBe(false);
  });

  it('returns false for a JSON string', () => {
    expect(isPathbuilderId('{"build":{}}')).toBe(false);
  });

  it('returns false for a string with letters', () => {
    expect(isPathbuilderId('abc123')).toBe(false);
  });

  it('returns false for a float', () => {
    expect(isPathbuilderId('42.5')).toBe(false);
  });
});
