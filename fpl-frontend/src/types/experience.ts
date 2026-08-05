export type BadgeConfig = {
  templateId: string;
  icon: 'shield' | 'crown' | 'flame' | 'bolt' | 'star' | 'trophy';
  primaryColor: string;
  accentColor: string;
};

export type PlayerProfile = {
  id: string;
  displayName: string;
  email?: string | null;
  telegramUsername?: string | null;
  telegramPhotoUrl?: string | null;
  phoneE164?: string | null;
  locale: string;
  referralCode: string;
  onboardingCompletedAt?: string | null;
  badgeConfig: BadgeConfig;
  notificationPreferences: {
    deadline: boolean;
    wallet: boolean;
    league: boolean;
    winners: boolean;
    telegram: boolean;
  };
};

export type ProfileStatistics = {
  totalPoints: number;
  bestRank: number | null;
  leaguesWon: number;
  prizeEarningsMinor: number;
};

export type LeaderboardEntry = {
  rank: number;
  previousRank: number | null;
  userId: string;
  username: string;
  teamName: string;
  points: number;
  prizeMinor: number;
  avatarUrl?: string | null;
  isCurrentUser: boolean;
};

export type LeaderboardResponse = {
  scope: 'gameweek' | 'overall';
  gameweek: number | null;
  data: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
};

export type AppNotification = {
  id: string;
  type: 'DEADLINE' | 'WALLET' | 'LEAGUE' | 'WINNER' | 'SYSTEM';
  title: string;
  message: string;
  actionUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
};

