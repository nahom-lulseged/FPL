import { createBrowserRouter } from 'react-router-dom';
import { TelegramAppShell } from '@/components/layout/TelegramAppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { RouteErrorFallback } from '@/components/common/RouteErrorFallback';
import { SmoothScrollProvider } from '@/components/layout/SmoothScrollProvider';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    lazy: async () => {
      const { SplashPage } = await import('@/pages/onboarding/SplashPage');
      return { Component: SplashPage };
    },
  },
  {
    path: '/splash',
    lazy: async () => {
      const { SplashPage } = await import('@/pages/onboarding/SplashPage');
      return { Component: SplashPage };
    },
  },
  {
    path: '/onboarding',
    lazy: async () => {
      const { OnboardingPage } = await import('@/pages/onboarding/OnboardingPage');
      return { Component: OnboardingPage };
    },
  },
  {
    path: '/telegram-auth',
    lazy: async () => {
      const { TelegramAuthPage } = await import('@/pages/onboarding/TelegramAuthPage');
      return { Component: TelegramAuthPage };
    },
  },
  {
    element: (
      <SmoothScrollProvider>
        <ProtectedRoute />
      </SmoothScrollProvider>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      {
        element: <TelegramAppShell />,
        children: [
          {
            path: '/home',
            lazy: async () => {
              const { HomePage } = await import('@/pages/home/HomePage');
              return { Component: HomePage };
            },
          },
          {
            path: '/team',
            lazy: async () => {
              const { TeamHubPage } = await import('@/pages/team/TeamHubPage');
              return { Component: TeamHubPage };
            },
          },
          {
            path: '/my-team',
            lazy: async () => {
              const { MyTeamPage } = await import('@/pages/team/MyTeamPage');
              return { Component: MyTeamPage };
            },
          },
          {
            path: '/squad-selection',
            lazy: async () => {
              const { SquadSelectionPage } = await import('@/pages/team/SquadSelectionPage');
              return { Component: SquadSelectionPage };
            },
          },
          {
            path: '/my-team/history',
            lazy: async () => {
              const { PointsHistoryPage } = await import('@/pages/team/PointsHistoryPage');
              return { Component: PointsHistoryPage };
            },
          },
          {
            path: '/transfers',
            lazy: async () => {
              const { TransfersPage } = await import('@/pages/team/TransfersPage');
              return { Component: TransfersPage };
            },
          },
          {
            path: '/transfers/replace/:playerOutId',
            lazy: async () => {
              const { TransfersPage } = await import('@/pages/team/TransfersPage');
              return { Component: TransfersPage };
            },
          },
          {
            path: '/transfers/review',
            lazy: async () => {
              const { TransfersPage } = await import('@/pages/team/TransfersPage');
              return { Component: TransfersPage };
            },
          },
          {
            path: '/leagues',
            lazy: async () => {
              const { LeaguesListPage } = await import('@/pages/leagues/LeaguesListPage');
              return { Component: LeaguesListPage };
            },
          },
          {
            path: '/leagues/create',
            lazy: async () => {
              const { CreateLeaguePage } = await import('@/pages/leagues/CreateLeaguePage');
              return { Component: CreateLeaguePage };
            },
          },
          {
            path: '/leagues/join',
            lazy: async () => {
              const { JoinLeaguePage } = await import('@/pages/leagues/JoinLeaguePage');
              return { Component: JoinLeaguePage };
            },
          },
          {
            path: '/leagues/configure',
            lazy: async () => {
              const { ConfigureLeaguesPage } = await import('@/pages/leagues/ConfigureLeaguesPage');
              return { Component: ConfigureLeaguesPage };
            },
          },
          {
            path: '/leagues/:id',
            lazy: async () => {
              const { LeagueDetailPage } = await import('@/pages/leagues/LeagueDetailPage');
              return { Component: LeagueDetailPage };
            },
          },
          {
            path: '/wallet',
            lazy: async () => {
              const { WalletPage } = await import('@/pages/wallet/WalletPage');
              return { Component: WalletPage };
            },
          },
          {
            path: '/wallet/kyc',
            lazy: async () => {
              const { KycVerificationPage } = await import('@/pages/wallet/KycVerificationPage');
              return { Component: KycVerificationPage };
            },
          },
          {
            path: '/fixtures',
            lazy: async () => {
              const { FixturesPage } = await import('@/pages/stats/FixturesPage');
              return { Component: FixturesPage };
            },
          },
          {
            path: '/premier-league',
            lazy: async () => {
              const { PremierLeagueDataPage } = await import('@/pages/stats/PremierLeagueDataPage');
              return { Component: PremierLeagueDataPage };
            },
          },
          {
            path: '/match-center',
            lazy: async () => {
              const { MatchCenterPage } = await import('@/pages/matches/MatchCenterPage');
              return { Component: MatchCenterPage };
            },
          },
          {
            path: '/matches/:id',
            lazy: async () => {
              const { MatchDetailPage } = await import('@/pages/matches/MatchDetailPage');
              return { Component: MatchDetailPage };
            },
          },
          {
            path: '/leaderboard',
            lazy: async () => {
              const { LeaderboardPage } = await import('@/pages/leaderboard/LeaderboardPage');
              return { Component: LeaderboardPage };
            },
          },
          {
            path: '/notifications',
            lazy: async () => {
              const { NotificationsPage } = await import('@/pages/notifications/NotificationsPage');
              return { Component: NotificationsPage };
            },
          },
          {
            path: '/profile',
            lazy: async () => {
              const { ProfilePage } = await import('@/pages/profile/ProfilePage');
              return { Component: ProfilePage };
            },
          },
          {
            path: '/more',
            lazy: async () => {
              const { MorePage } = await import('@/pages/more/MorePage');
              return { Component: MorePage };
            },
          },
          {
            path: '/profile/badge',
            lazy: async () => {
              const { BadgeBuilderPage } = await import('@/pages/profile/BadgeBuilderPage');
              return { Component: BadgeBuilderPage };
            },
          },
          {
            path: '/profile/verification',
            lazy: async () => {
              const { VerificationPage } = await import('@/pages/profile/VerificationPage');
              return { Component: VerificationPage };
            },
          },
          {
            path: '/stats/dream-team',
            lazy: async () => {
              const { DreamTeamPage } = await import('@/pages/stats/DreamTeamPage');
              return { Component: DreamTeamPage };
            },
          },
          {
            path: '/players/:id',
            lazy: async () => {
              const { PlayerProfilePage } = await import('@/pages/stats/PlayerProfilePage');
              return { Component: PlayerProfilePage };
            },
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
