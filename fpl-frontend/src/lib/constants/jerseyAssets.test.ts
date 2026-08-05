import { describe, expect, it } from 'vitest';
import { CLUB_JERSEY_ASSETS, getClubJerseyAsset } from '@/lib/constants/jerseyAssets';

const LIVE_SHORT_NAMES = [
  'ARS',
  'AVL',
  'BHA',
  'BOU',
  'BRE',
  'CHE',
  'COV',
  'CRY',
  'EVE',
  'FUL',
  'HUL',
  'IPS',
  'LEE',
  'LIV',
  'MCI',
  'MUN',
  'NEW',
  'NFO',
  'SUN',
  'TOT',
] as const;

describe('jersey assets', () => {
  it('maps every current live club short name to a static jersey asset', () => {
    expect(Object.keys(CLUB_JERSEY_ASSETS).sort()).toEqual([...LIVE_SHORT_NAMES].sort());

    for (const shortName of LIVE_SHORT_NAMES) {
      expect(getClubJerseyAsset(shortName)).toMatchObject({
        src: `/assets/jerseys/${shortName}.png`,
      });
    }
  });

  it('uses the outfield shirt for goalkeepers until a GK-specific variant exists', () => {
    expect(getClubJerseyAsset('LIV', 'GK')).toEqual(getClubJerseyAsset('LIV', 'MID'));
  });

  it('returns null when no static jersey exists', () => {
    expect(getClubJerseyAsset('XYZ', 'DEF', 'club-xyz')).toBeNull();
  });
});
