/** Premier League badge `code` values used by resources.premierleague.com */
const SHORT_NAME_TO_BADGE_CODE: Record<string, number> = {
  ARS: 3,
  AVL: 7,
  BOU: 91,
  BRE: 94,
  BHA: 36,
  BUR: 90,
  CHE: 8,
  COV: 9,
  CRY: 31,
  EVE: 11,
  FUL: 54,
  HUL: 88,
  IPS: 40,
  LEE: 2,
  LEI: 13,
  LIV: 14,
  MCI: 43,
  MUN: 1,
  NEW: 4,
  NFO: 17,
  SOU: 20,
  SUN: 56,
  TOT: 6,
  WHU: 21,
  WOL: 39,
};

export function getClubBadgeCode(shortName: string): number | null {
  const code = SHORT_NAME_TO_BADGE_CODE[shortName.trim().toUpperCase()];
  return code ?? null;
}

export function getClubCrestUrl(shortName: string, _size = 70): string | null {
  const code = getClubBadgeCode(shortName);
  if (code === null) {
    return null;
  }
  return `/crests/${shortName.trim().toUpperCase()}.webp`;
}
