export interface TeamScoreDiff {
  teamId: string;
  teamName: string;
  oldPoints: number;
  newPoints: number;
  delta: number;
}

export interface ScoringSummary {
  teamsTotal: number;
  teamsChanged: number;
  totalDelta: number;
}

export interface StatTypeOption {
  value: string;
  inputType: 'number' | 'boolean';
}

export interface CorrectionPatch {
  playerId: string;
  gameweekId: string;
  statType: string;
  newValue: number | boolean;
  beforeStats: Record<string, unknown>;
  afterStats: Record<string, unknown>;
  oldPlayerPoints: number;
  newPlayerPoints: number;
}

export interface RecalculatePreviewResponse {
  previewToken: string;
  diffs: TeamScoreDiff[];
  summary: ScoringSummary;
  gameweek: { id: string; number: number };
}

export interface CorrectionPreviewResponse {
  previewToken: string;
  player: { id: string; name: string };
  correction: CorrectionPatch;
  diffs: TeamScoreDiff[];
  summary: ScoringSummary;
  gameweek: { id: string; number: number };
}

export interface RecalculationHistoryItem {
  id: string;
  gameweekId: string;
  gameweekNumber: number;
  type: 'FULL_RECALC' | 'CORRECTION';
  teamsAffected: number;
  reason: string | null;
  createdAt: string;
  admin: { id: string; displayName: string; email: string };
}

export interface RecalculationHistoryDetail extends RecalculationHistoryItem {
  diffs: TeamScoreDiff[];
}

export interface RecalculateCommitResponse {
  gameweek: { id: string; number: number };
  teamsScored: number;
  diffs: TeamScoreDiff[];
  reason: string;
}

export interface CorrectionCommitResponse {
  correction: CorrectionPatch;
  diffs: TeamScoreDiff[];
  reason: string;
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
