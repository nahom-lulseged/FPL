export interface PlayerListItem {
  id: string;
  fplId: number | null;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number;
  isAvailable: boolean;
  injuryNote?: string | null;
  isManualOverride?: boolean;
  realTeam: {
    id: string;
    name: string;
    shortName: string;
  };
}

export interface PlayerOverrideBody {
  price?: number;
  isAvailable?: boolean;
  injuryNote?: string | null;
}

export interface PlayersListResponse {
  data: PlayerListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
