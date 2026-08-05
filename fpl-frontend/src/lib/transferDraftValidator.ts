import {
  MAX_PLAYERS_PER_CLUB,
  applyPendingTransfers,
  calculateTransferHit,
  isUnlimitedTransferChip,
  squadEntryToTransferInput,
} from '@/lib/fplRules';
import type { PendingTransfer, TransferChipSelection } from '@/types/transfer';
import type { TeamDetail } from '@/types/team';

export type TransferDraftIssueCode =
  | 'INCOMPLETE_SLOT'
  | 'BUDGET_EXCEEDED'
  | 'MAX_PER_CLUB_EXCEEDED'
  | 'PLAYER_UNAVAILABLE'
  | 'DUPLICATE_PLAYERS'
  | 'POSITION_MISMATCH'
  | 'SELF_REPLACEMENT';

export interface TransferDraftIssue {
  code: TransferDraftIssueCode;
  message: string;
  playerId?: string;
}

export interface TransferDraftValidation {
  projectedBank: number;
  replacementBudget: number;
  pointHit: number;
  freeTransfersUsed: number;
  additionalTransfersUsed: number;
  isUnlimitedTransfers: boolean;
  issues: TransferDraftIssue[];
  canReview: boolean;
  canSubmit: boolean;
  invalidPlayerIds: Set<string>;
  pendingIncomingIds: Set<string>;
}

export interface TransferDraftContext {
  activeRemovedPlayerId: string | null;
  selectedChip?: TransferChipSelection | null;
  gameweekNumber?: number | null;
}

export function validateTransferDraft(
  team: TeamDetail,
  pendingTransfers: PendingTransfer[],
  context: TransferDraftContext,
): TransferDraftValidation {
  const { activeRemovedPlayerId, selectedChip = null, gameweekNumber = team.gameweek?.number } = context;
  const projectedBank = team.bankBalance - pendingTransfers.reduce(
    (total, transfer) => total + transfer.playerIn.price - transfer.playerOut.price,
    0,
  );
  const issues: TransferDraftIssue[] = [];
  const invalidPlayerIds = new Set<string>();
  const pendingIncomingIds = new Set(pendingTransfers.map((transfer) => transfer.playerInId));
  const isUnlimitedTransfers =
    gameweekNumber === 1 ||
    isUnlimitedTransferChip(team.activeChip ?? null) ||
    Boolean(selectedChip);
  const pointHit = calculateTransferHit(
    pendingTransfers.length,
    team.freeTransfers,
    isUnlimitedTransfers,
  );
  const freeTransfersUsed = isUnlimitedTransfers
    ? pendingTransfers.length
    : Math.min(pendingTransfers.length, team.freeTransfers);
  const additionalTransfersUsed = isUnlimitedTransfers
    ? 0
    : Math.max(0, pendingTransfers.length - team.freeTransfers);
  const activeOutgoing = activeRemovedPlayerId
    ? team.squad.find((entry) => entry.playerId === activeRemovedPlayerId)
    : undefined;
  const replacementBudget = activeOutgoing
    ? team.bankBalance - pendingTransfers
        .filter((transfer) => transfer.playerOutId !== activeOutgoing.playerId)
        .reduce((total, transfer) => total + transfer.playerIn.price - transfer.playerOut.price, 0) +
      activeOutgoing.player.price
    : projectedBank;

  if (activeRemovedPlayerId) {
    const outgoing = team.squad.find((entry) => entry.playerId === activeRemovedPlayerId);
    issues.push({
      code: 'INCOMPLETE_SLOT',
      message: outgoing
        ? `Choose a replacement for ${outgoing.player.name}.`
        : 'Complete the open transfer slot.',
      playerId: activeRemovedPlayerId,
    });
    invalidPlayerIds.add(activeRemovedPlayerId);
  }

  if (projectedBank < 0) {
    issues.push({
      code: 'BUDGET_EXCEEDED',
      message: `Funds not available to complete your transfer (${formatBankShortfall(projectedBank)} short).`,
    });
    pendingTransfers
      .filter((transfer) => transfer.playerIn.price > transfer.playerOut.price)
      .forEach((transfer) => invalidPlayerIds.add(transfer.playerInId));
  }

  const projectedSquad = applyPendingTransfers(
    team.squad.map(squadEntryToTransferInput),
    pendingTransfers.map((transfer) => ({
      playerOutId: transfer.playerOutId,
      playerIn: transfer.playerIn,
    })),
  );

  for (const transfer of pendingTransfers) {
    if (transfer.playerInId === transfer.playerOutId) {
      issues.push({
        code: 'SELF_REPLACEMENT',
        message: 'A player cannot replace themselves.',
        playerId: transfer.playerInId,
      });
      invalidPlayerIds.add(transfer.playerInId);
    }
    if (transfer.playerIn.position !== transfer.playerOut.position) {
      issues.push({
        code: 'POSITION_MISMATCH',
        message: `A ${transfer.playerOut.position} must be replaced by another ${transfer.playerOut.position}.`,
        playerId: transfer.playerInId,
      });
      invalidPlayerIds.add(transfer.playerInId);
    }
  }

  const seenIds = new Set<string>();
  for (const player of projectedSquad) {
    if (!player.isAvailable) {
      issues.push({
        code: 'PLAYER_UNAVAILABLE',
        message: 'One selected player is unavailable.',
        playerId: player.playerId,
      });
      invalidPlayerIds.add(player.playerId);
    }
    if (seenIds.has(player.playerId)) {
      issues.push({
        code: 'DUPLICATE_PLAYERS',
        message: 'Your squad cannot contain duplicate players.',
        playerId: player.playerId,
      });
      invalidPlayerIds.add(player.playerId);
    }
    seenIds.add(player.playerId);
  }

  const clubCounts = new Map<string, { count: number; playerIds: string[]; name?: string }>();
  for (const player of projectedSquad) {
    const existing = clubCounts.get(player.realTeamId) ?? { count: 0, playerIds: [] };
    existing.count += 1;
    existing.playerIds.push(player.playerId);
    clubCounts.set(player.realTeamId, existing);
  }

  for (const club of clubCounts.values()) {
    if (club.count > MAX_PLAYERS_PER_CLUB) {
      issues.push({
        code: 'MAX_PER_CLUB_EXCEEDED',
        message: `Maximum ${MAX_PLAYERS_PER_CLUB} players per club exceeded.`,
      });
      club.playerIds.forEach((playerId) => invalidPlayerIds.add(playerId));
    }
  }

  return {
    projectedBank,
    replacementBudget,
    pointHit,
    freeTransfersUsed,
    additionalTransfersUsed,
    isUnlimitedTransfers,
    issues,
    canReview: pendingTransfers.length > 0 && issues.length === 0,
    canSubmit: pendingTransfers.length > 0 && issues.length === 0,
    invalidPlayerIds,
    pendingIncomingIds,
  };
}

function formatBankShortfall(projectedBank: number) {
  return `£${(Math.abs(projectedBank) / 10).toFixed(1)}m`;
}
