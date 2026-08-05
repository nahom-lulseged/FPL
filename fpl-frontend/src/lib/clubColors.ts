const CLUB_COLORS: Record<string, { bg: string; text: string }> = {
  ARS: { bg: '#EF0107', text: '#FFFFFF' },
  AVL: { bg: '#670E36', text: '#95BFE5' },
  BOU: { bg: '#DA291C', text: '#000000' },
  BRE: { bg: '#E30613', text: '#FFFFFF' },
  BHA: { bg: '#0057B8', text: '#FFFFFF' },
  CHE: { bg: '#034694', text: '#FFFFFF' },
  CRY: { bg: '#1B458F', text: '#C4122E' },
  EVE: { bg: '#003399', text: '#FFFFFF' },
  FUL: { bg: '#000000', text: '#FFFFFF' },
  IPS: { bg: '#003399', text: '#FFFFFF' },
  LEI: { bg: '#003090', text: '#FDBE11' },
  LIV: { bg: '#C8102E', text: '#FFFFFF' },
  MCI: { bg: '#6CABDD', text: '#1C2C5B' },
  MUN: { bg: '#DA291C', text: '#FBE122' },
  NEW: { bg: '#241F20', text: '#FFFFFF' },
  NFO: { bg: '#DD0000', text: '#FFFFFF' },
  SOU: { bg: '#D71920', text: '#FFFFFF' },
  TOT: { bg: '#132257', text: '#FFFFFF' },
  WHU: { bg: '#7A263A', text: '#1BB1E7' },
  WOL: { bg: '#FDB913', text: '#231F20' },
};

const DEFAULT_CLUB_COLOR = { bg: '#38003C', text: '#00FF85' };

export function getClubColor(shortName: string): { bg: string; text: string } {
  return CLUB_COLORS[shortName.toUpperCase()] ?? DEFAULT_CLUB_COLOR;
}

export function getPlayerInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
