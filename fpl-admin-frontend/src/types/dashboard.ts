export interface DashboardGameweek {
  id: string;
  number: number;
  deadline: string;
  status: string;
  isCurrent: boolean;
}

export interface DashboardSummary {
  totalUsers: number;
  totalTeams: number;
  activeLeagues: number;
  currentGameweek: DashboardGameweek | null;
  nextGameweek: DashboardGameweek | null;
  lastIngestionSync: {
    timestamp: string | null;
    success: boolean | null;
  };
  dbConnectionOk: boolean;
  redisConnectionOk: boolean;
}

export interface DashboardFixture {
  id: string;
  kickoffTime: string;
  homeScore: number | null;
  awayScore: number | null;
  started: boolean;
  finished: boolean;
  minutes: number | null;
  isPostponed: boolean;
  gameweek: { id: string; number: number };
  homeTeam: { id: string; name: string; shortName: string; crestUrl: string | null };
  awayTeam: { id: string; name: string; shortName: string; crestUrl: string | null };
}

export interface DashboardOverview {
  generatedAt: string;
  currentGameweek: DashboardGameweek | null;
  nextGameweek: DashboardGameweek | null;
  system: {
    dbOk: boolean;
    redisOk: boolean;
    lastSyncAt: string | null;
    lastSyncSuccess: boolean | null;
  };
  kpis: {
    totalUsers: { value: number; change: number | null };
    activeTeams: { value: number; change: number | null; season: string | null };
    transfers24h: { value: number; change: number | null };
    revenue: { valueMinor: number; currency: string; change: number | null };
  };
  featuredFixture: DashboardFixture | null;
  topPlayers: Array<{
    id: string; name: string; position: string; price: number; totalPoints: number;
    eventPoints: number; selectedByPercent: number; isAvailable: boolean;
    realTeam: { name: string; shortName: string; crestUrl: string | null };
  }>;
  recentFixtures: DashboardFixture[];
  recentTransfers: Array<{
    id: string; createdAt: string; pricePaid: number;
    playerIn: { id: string; name: string };
    playerOut: { id: string; name: string };
    team: { name: string; user: { displayName: string } };
  }>;
  recentActivity: Array<{
    id: string; action: string; targetType: string; targetId: string; createdAt: string;
    admin: { displayName: string };
  }>;
  trend: Array<{ date: string; registrations: number; teamsCreated: number; transfers: number; revenueMinor: number }>;
  captainPicks: Array<{ playerId: string; playerName: string; team: { shortName: string; crestUrl: string | null } | null; count: number }>;
  formationDistribution: Array<{ formation: string; count: number }>;
  clubPerformance: Array<{
    id: string; name: string; shortName: string; crestUrl: string | null;
    wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number;
    points: number; form: string[];
  }>;
}
