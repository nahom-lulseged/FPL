import type { Position } from '@/types/player';

export interface JerseyAsset {
  src: string;
  width: number;
  height: number;
}

export interface ClubJerseyAssets {
  outfield: JerseyAsset;
  goalkeeper?: JerseyAsset;
}

const JERSEY_BASE_PATH = '/assets/jerseys';

export const CLUB_JERSEY_ASSETS = {
  ARS: { outfield: { src: `${JERSEY_BASE_PATH}/ARS.png`, width: 155, height: 155 } },
  AVL: { outfield: { src: `${JERSEY_BASE_PATH}/AVL.png`, width: 144, height: 144 } },
  BHA: { outfield: { src: `${JERSEY_BASE_PATH}/BHA.png`, width: 143, height: 143 } },
  BOU: { outfield: { src: `${JERSEY_BASE_PATH}/BOU.png`, width: 172, height: 172 } },
  BRE: { outfield: { src: `${JERSEY_BASE_PATH}/BRE.png`, width: 148, height: 148 } },
  CHE: { outfield: { src: `${JERSEY_BASE_PATH}/CHE.png`, width: 172, height: 172 } },
  COV: { outfield: { src: `${JERSEY_BASE_PATH}/COV.png`, width: 142, height: 142 } },
  CRY: { outfield: { src: `${JERSEY_BASE_PATH}/CRY.png`, width: 148, height: 148 } },
  EVE: { outfield: { src: `${JERSEY_BASE_PATH}/EVE.png`, width: 150, height: 150 } },
  FUL: { outfield: { src: `${JERSEY_BASE_PATH}/FUL.png`, width: 173, height: 173 } },
  HUL: { outfield: { src: `${JERSEY_BASE_PATH}/HUL.png`, width: 149, height: 149 } },
  IPS: { outfield: { src: `${JERSEY_BASE_PATH}/IPS.png`, width: 146, height: 146 } },
  LEE: { outfield: { src: `${JERSEY_BASE_PATH}/LEE.png`, width: 153, height: 153 } },
  LIV: { outfield: { src: `${JERSEY_BASE_PATH}/LIV.png`, width: 156, height: 156 } },
  MCI: { outfield: { src: `${JERSEY_BASE_PATH}/MCI.png`, width: 152, height: 152 } },
  MUN: { outfield: { src: `${JERSEY_BASE_PATH}/MUN.png`, width: 163, height: 163 } },
  NEW: { outfield: { src: `${JERSEY_BASE_PATH}/NEW.png`, width: 153, height: 152 } },
  NFO: { outfield: { src: `${JERSEY_BASE_PATH}/NFO.png`, width: 143, height: 143 } },
  SUN: { outfield: { src: `${JERSEY_BASE_PATH}/SUN.png`, width: 158, height: 157 } },
  TOT: { outfield: { src: `${JERSEY_BASE_PATH}/TOT.png`, width: 170, height: 170 } },
} satisfies Record<string, ClubJerseyAssets>;

export type ClubJerseyShortName = keyof typeof CLUB_JERSEY_ASSETS;

const missingJerseyKeys = new Map<string, { clubId?: string; shortName: string }>();

function normalizeShortName(shortName: string): string {
  return shortName.trim().toUpperCase();
}

function warnMissingJersey(shortName: string, clubId?: string) {
  if (!import.meta.env.DEV) {
    return;
  }

  const normalized = normalizeShortName(shortName);
  if (missingJerseyKeys.has(normalized)) {
    return;
  }

  missingJerseyKeys.set(normalized, { clubId, shortName: normalized });
  console.warn(
    '[jerseys] Missing static jersey assets. Falling back to procedural SVG.',
    Array.from(missingJerseyKeys.values()),
  );
}

export function getClubJerseyAsset(
  shortName: string,
  position?: Position,
  clubId?: string,
): JerseyAsset | null {
  const normalized = normalizeShortName(shortName);
  const assets: ClubJerseyAssets | undefined = CLUB_JERSEY_ASSETS[normalized as ClubJerseyShortName];

  if (!assets) {
    warnMissingJersey(normalized, clubId);
    return null;
  }

  if (position === 'GK' && assets.goalkeeper) {
    return assets.goalkeeper;
  }

  return assets.outfield;
}
