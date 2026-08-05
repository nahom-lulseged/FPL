export type GameweekStatus = 'UPCOMING' | 'LIVE' | 'FINISHED';

export interface Gameweek {
  id: string;
  number: number;
  deadline: string;
  status: GameweekStatus;
  isCurrent: boolean;
}

export interface GameweeksListResponse {
  data: Gameweek[];
}

export interface TransferWindow {
  isOpen: boolean;
  gameweek: Gameweek | null;
}
