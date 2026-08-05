import type { PaginatedResponse } from '@/types/ingestionStatus';
import type { Role } from '@/types/user';

export interface AdminUserListRow {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  isSuspended: boolean;
  suspendedAt: string | null;
  createdAt: string;
  teamCount: number;
  leagueMembershipCount: number;
}

export interface AdminUserListParams {
  page?: number;
  limit?: number;
  search?: string;
  registeredFrom?: string;
  registeredTo?: string;
  isAdmin?: boolean;
  hasTeam?: boolean;
  sortBy?: 'createdAt' | 'email' | 'displayName' | 'teamCount';
  sortDir?: 'asc' | 'desc';
}

export interface AdminUserSquadPlayer {
  position: string;
  isStarter: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
  benchOrder: number | null;
  player: {
    id: string;
    name: string;
    position: string;
    price: number;
  };
}

export interface AdminUserTeam {
  id: string;
  name: string;
  season: string;
  totalPoints: number;
  bankBalance: number;
  squadValue: number;
  transferCount: number;
  squad: AdminUserSquadPlayer[];
}

export interface AdminUserLeagueMembership {
  id: string;
  joinedAt: string;
  league: {
    id: string;
    name: string;
    type: string;
    season: string;
  };
}

export interface AdminUserDetail {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  updatedAt: string;
  transferCount: number;
  teams: AdminUserTeam[];
  leagueMemberships: AdminUserLeagueMembership[];
}

export interface AdminUserSnapshot {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  isAdmin: boolean;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
}

export type AdminUsersListResponse = PaginatedResponse<AdminUserListRow>;
