import { randomInt } from 'crypto';
import type { LeagueType } from '@prisma/client';
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from '../../lib/constants';

export interface ClassicStandingInput {
  userId: string;
  teamId: string;
  teamName: string;
  managerName: string;
  totalPoints: number;
  gameweekPoints: number | null;
  chipsUsed: Array<{ chipType: string; gameweekNumber: number }>;
}

export interface ClassicStandingRow extends ClassicStandingInput {
  rank: number;
}

export type JoinErrorCode =
  | 'LEAGUE_NOT_FOUND'
  | 'NO_TEAM_FOR_SEASON'
  | 'ALREADY_MEMBER'
  | 'TEAM_ALREADY_IN_LEAGUE';

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

// HEAD_TO_HEAD deferred: LeagueType enum reserved; H2HFixture table and pairing
// logic not implemented. Classic leagues only until product approves H2H scope.
export function canCreateLeagueType(type: LeagueType): boolean {
  return type === 'CLASSIC';
}

export function joinErrorMessage(code: JoinErrorCode): string {
  switch (code) {
    case 'LEAGUE_NOT_FOUND':
      return 'League not found for this invite code';
    case 'NO_TEAM_FOR_SEASON':
      return 'You need a team for this season before joining a league';
    case 'ALREADY_MEMBER':
      return 'You are already a member of this league';
    case 'TEAM_ALREADY_IN_LEAGUE':
      return 'Your team is already in this league';
    default:
      return 'Cannot join league';
  }
}

export function rankClassicStandings(rows: ClassicStandingInput[]): ClassicStandingRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return a.managerName.localeCompare(b.managerName);
  });

  const ranked: ClassicStandingRow[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i].totalPoints < sorted[i - 1].totalPoints) {
      currentRank = i + 1;
    }
    ranked.push({
      ...sorted[i],
      rank: currentRank,
    });
  }

  return ranked;
}
