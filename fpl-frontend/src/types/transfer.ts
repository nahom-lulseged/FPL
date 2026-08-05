import type { TeamDetail } from '@/types/team';
import type { PlayerListItem } from '@/types/player';

export interface TransferInput {
  playerInId: string;
  playerOutId: string;
}

export type TransferChipSelection =
  | { type: 'FREE_HIT' }
  | { type: 'WILDCARD'; wildcardNumber: 1 | 2 };

export interface SubmitTransfersInput {
  transfers: TransferInput[];
  chip?: TransferChipSelection;
}

export interface TransferSummary {
  transfersMade: number;
  pointsHit: number;
  freeTransfersRemaining: number;
}

export interface SubmitTransfersResponse extends TeamDetail {
  transferSummary: TransferSummary;
}

export interface PendingTransfer {
  playerOutId: string;
  playerInId: string;
  playerOut: PlayerListItem;
  playerIn: PlayerListItem;
}

export interface TransferHistoryItem {
  id: string;
  gameweek: { number: number };
  playerIn: { id: string; name: string; price: number };
  playerOut: { id: string; name: string; price: number };
  pricePaid: number;
  createdAt: string;
}

export interface TransferHistoryParams {
  page?: number;
  limit?: number;
  gameweek?: number;
}
