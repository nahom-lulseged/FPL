import { describe, expect, it } from 'vitest';
import { getJerseyDataUri } from '@/lib/clubJersey';

describe('getJerseyDataUri', () => {
  it('returns a data URI for a known club', () => {
    const uri = getJerseyDataUri('ARS');
    expect(uri.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('returns a data URI for an unknown club without throwing', () => {
    const uri = getJerseyDataUri('XYZ');
    expect(uri.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('memoizes results for the same club code', () => {
    const first = getJerseyDataUri('LIV');
    const second = getJerseyDataUri('liv');
    expect(second).toBe(first);
  });
});
