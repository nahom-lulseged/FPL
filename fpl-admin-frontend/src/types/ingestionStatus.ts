export interface IngestionStatus {
  lastSyncAt: string | null;
  success: boolean | null;
  error: string | null;
}

export interface ManualSyncResult {
  success: boolean;
  syncedAt: string;
  result: {
    created: number;
    updated: number;
    skipped: number;
  };
}

export type SyncType = 'ALL' | 'TEAMS' | 'PLAYERS' | 'FIXTURES' | 'GAMEWEEKS';

export type SyncTriggerType = 'teams' | 'players' | 'fixtures' | 'gameweeks' | 'all';

export interface SyncLogRow {
  id: string;
  syncType: SyncType;
  startedAt: string;
  finishedAt: string | null;
  success: boolean;
  rowsChanged: number;
  errorMessage: string | null;
  durationMs: number | null;
}

export interface SyncHistoryParams {
  page?: number;
  limit?: number;
  syncType?: SyncType;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
