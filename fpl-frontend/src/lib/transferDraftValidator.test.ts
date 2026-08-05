import { describe, expect, it } from 'vitest';
import { validateTransferDraft } from '@/lib/transferDraftValidator';
import { DEFAULT_PLAYER_STATS, type PlayerListItem, type Position } from '@/types/player';
import type { SquadEntry, TeamDetail } from '@/types/team';
import type { PendingTransfer } from '@/types/transfer';

const positions: Position[] = [
  'GK', 'GK',
  'DEF', 'DEF', 'DEF', 'DEF', 'DEF',
  'MID', 'MID', 'MID', 'MID', 'MID',
  'FWD', 'FWD', 'FWD',
];

function player(id: string, position: Position, price: number, club = `club-${id}`, available = true): PlayerListItem {
  return {
    ...DEFAULT_PLAYER_STATS,
    id,
    name: `Player ${id}`,
    position,
    price,
    isAvailable: available,
    realTeam: { id: club, name: club, shortName: club.slice(-3).toUpperCase() },
  };
}

function squadEntry(item: PlayerListItem, index: number): SquadEntry {
  return {
    playerId: item.id,
    position: item.position,
    isStarter: index < 11,
    benchOrder: index < 11 ? null : index - 10,
    isCaptain: false,
    isViceCaptain: false,
    player: { name: item.name, price: item.price, realTeam: item.realTeam },
    rawPoints: null,
    gameweekPoints: null,
    counted: null,
    captainMultiplier: null,
    wasSubstitutedIn: null,
    wasSubstitutedOut: null,
    pointsStatus: 'pending',
  };
}

function makeTeam(): TeamDetail {
  const players = positions.map((position, index) =>
    player(`p${index + 1}`, position, 50, `club-${Math.floor(index / 3)}`),
  );
  return {
    id: 'team-1',
    name: 'Test XI',
    season: '2026/27',
    bankBalance: 10,
    squadValue: 750,
    totalPoints: 0,
    freeTransfers: 1,
    activeChip: null,
    gameweek: { number: 2, status: 'UPCOMING' },
    gameweekTotal: null,
    gameweekBreakdown: null,
    squad: players.map(squadEntry),
  };
}

function transfer(team: TeamDetail, outIndex: number, incoming: PlayerListItem): PendingTransfer {
  const outgoing = team.squad[outIndex]!;
  return {
    playerOutId: outgoing.playerId,
    playerInId: incoming.id,
    playerOut: player(outgoing.playerId, outgoing.position, outgoing.player.price, outgoing.player.realTeam.id),
    playerIn: incoming,
  };
}

describe('validateTransferDraft', () => {
  it('derives bank, replacement budget, hit, and incomplete-slot readiness centrally', () => {
    const team = makeTeam();
    const emptySlot = validateTransferDraft(team, [], {
      activeRemovedPlayerId: team.squad[7]!.playerId,
      gameweekNumber: 2,
    });
    expect(emptySlot.replacementBudget).toBe(60);
    expect(emptySlot.issues.map((issue) => issue.code)).toContain('INCOMPLETE_SLOT');
    expect(emptySlot.canReview).toBe(false);

    const first = transfer(team, 7, player('new-mid-1', 'MID', 55, 'new-club'));
    const second = transfer(team, 8, player('new-mid-2', 'MID', 50, 'new-club-2'));
    const draft = validateTransferDraft(team, [first, second], {
      activeRemovedPlayerId: null,
      gameweekNumber: 2,
    });
    expect(draft.projectedBank).toBe(5);
    expect(draft.pointHit).toBe(4);
    expect(draft.freeTransfersUsed).toBe(1);
    expect(draft.additionalTransfersUsed).toBe(1);
    expect(draft.canSubmit).toBe(true);
  });

  it('allows an over-budget preview but marks the incoming card and blocks review', () => {
    const team = makeTeam();
    const incoming = player('premium-mid', 'MID', 70, 'premium-club');
    const draft = validateTransferDraft(team, [transfer(team, 7, incoming)], {
      activeRemovedPlayerId: null,
      gameweekNumber: 2,
    });
    expect(draft.projectedBank).toBe(-10);
    expect(draft.issues.map((issue) => issue.code)).toContain('BUDGET_EXCEEDED');
    expect(draft.invalidPlayerIds.has(incoming.id)).toBe(true);
    expect(draft.canReview).toBe(false);
  });

  it('makes Gameweek 1, Wildcard, and Free Hit drafts unlimited', () => {
    const team = makeTeam();
    const pending = [
      transfer(team, 7, player('mid-a', 'MID', 50, 'new-a')),
      transfer(team, 8, player('mid-b', 'MID', 50, 'new-b')),
    ];
    expect(validateTransferDraft(team, pending, { activeRemovedPlayerId: null, gameweekNumber: 1 }).pointHit).toBe(0);
    expect(validateTransferDraft(team, pending, { activeRemovedPlayerId: null, selectedChip: { type: 'FREE_HIT' }, gameweekNumber: 2 }).pointHit).toBe(0);
    expect(validateTransferDraft(team, pending, { activeRemovedPlayerId: null, selectedChip: { type: 'WILDCARD', wildcardNumber: 1 }, gameweekNumber: 2 }).pointHit).toBe(0);
  });

  it('detects club-limit, duplicate, unavailable, and position issues', () => {
    const team = makeTeam();
    const crowdedClub = team.squad[0]!.player.realTeam.id;
    const invalid = [
      transfer(team, 7, player('club-limit-mid', 'MID', 50, crowdedClub)),
      transfer(team, 8, player(team.squad[9]!.playerId, 'MID', 50, team.squad[9]!.player.realTeam.id)),
      transfer(team, 12, player('wrong-player', 'DEF', 50, 'other', false)),
    ];
    const codes = validateTransferDraft(team, invalid, {
      activeRemovedPlayerId: null,
      gameweekNumber: 2,
    }).issues.map((issue) => issue.code);
    expect(codes).toEqual(expect.arrayContaining([
      'MAX_PER_CLUB_EXCEEDED',
      'DUPLICATE_PLAYERS',
      'PLAYER_UNAVAILABLE',
      'POSITION_MISMATCH',
    ]));
  });
});
