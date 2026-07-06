import { describe, expect, it } from 'vitest';
import { aonSearchUrl, resolveAonUrl } from './aonUrlResolver';

describe('resolveAonUrl', () => {
  it('builds a best-guess URL for a known category', () => {
    const url = resolveAonUrl('Fireball', 'spell');
    expect(url).toContain('2e.aonprd.com');
    expect(url).toContain('Spells');
    expect(url).toContain('Fireball');
  });

  it('returns undefined for an unknown category', () => {
    expect(resolveAonUrl('Foo', 'unknown-category')).toBeUndefined();
  });

  it('URL-encodes spaces in the name', () => {
    const url = resolveAonUrl('Power Attack', 'feat');
    expect(url).toContain('Power%20Attack');
  });

  it('trims leading and trailing whitespace from the name', () => {
    const url = resolveAonUrl('  Shield  ', 'action');
    expect(url).toContain('Shield');
    expect(url).not.toContain('  ');
  });
});

describe('aonSearchUrl', () => {
  it('returns a search URL containing the encoded query', () => {
    const url = aonSearchUrl('Grapple');
    expect(url).toContain('2e.aonprd.com');
    expect(url).toContain('Grapple');
  });

  it('percent-encodes special characters', () => {
    const url = aonSearchUrl('Flame & Frost');
    expect(url).toContain('Flame');
    expect(url).not.toContain(' & ');
  });
});
