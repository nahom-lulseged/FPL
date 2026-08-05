export const AUDIT_ACTIONS = [
  'USER_SUSPEND',
  'USER_UNSUSPEND',
  'USER_PROMOTE',
  'USER_DEMOTE',
  'USER_RESET_PASSWORD',
  'USER_DELETE',
  'PLAYER_UPDATE',
  'REAL_TEAM_UPDATE',
  'FIXTURE_UPDATE',
  'GAMEWEEK_UPDATE',
  'GAMEWEEK_FINALIZE',
  'RECALCULATE_COMMIT',
  'CORRECTION_COMMIT',
  'LEAGUE_MEMBER_REMOVE',
  'LEAGUE_DISSOLVE',
  'WITHDRAWAL_APPROVE',
  'WITHDRAWAL_REJECT',
  'DEPOSIT_APPROVE',
  'DEPOSIT_REJECT',
  'PAYOUT_COMMIT',
  'LEDGER_ADJUST',
  'DISPUTE_FREEZE',
  'DISPUTE_RESOLVE',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_TARGET_TYPES = [
  'User',
  'Player',
  'RealTeam',
  'Fixture',
  'Gameweek',
  'Scoring',
  'League',
  'Wallet',
  'Withdrawal',
  'Deposit',
  'Payout',
  'LedgerEntry',
] as const;

export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

export interface LogAdminActionInput {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  before: unknown;
  after?: unknown | null;
}
