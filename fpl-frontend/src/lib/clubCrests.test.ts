import { describe, expect, it } from 'vitest';
import { getClubBadgeCode, getClubCrestUrl } from '@/lib/clubCrests';

describe('clubCrests', () => {
  it('maps known short names to badge codes', () => {
    expect(getClubBadgeCode('LIV')).toBe(14);
    expect(getClubBadgeCode('ars')).toBe(3);
    expect(getClubBadgeCode('MUN')).toBe(1);
    expect(getClubBadgeCode('TOT')).toBe(6);
  });

  it('returns null for unknown clubs', () => {
    expect(getClubBadgeCode('XYZ')).toBeNull();
    expect(getClubCrestUrl('XYZ')).toBeNull();
  });

  it('builds local cached WebP badge URLs', () => {
    expect(getClubCrestUrl('LIV')).toBe('/crests/LIV.webp');
    expect(getClubCrestUrl('ARS', 50)).toBe('/crests/ARS.webp');
  });
});
