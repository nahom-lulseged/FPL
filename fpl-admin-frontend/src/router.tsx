import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  ProtectedAdminRoute,
  PublicOnlyAdminRoute,
} from '@/components/layout/ProtectedAdminRoute';
import { AdminLoginPage } from '@/pages/auth/AdminLoginPage';
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage';
import { PlayersManagePage } from '@/pages/content/PlayersManagePage';
import { RealTeamsManagePage } from '@/pages/content/RealTeamsManagePage';
import { FixturesManagePage } from '@/pages/content/FixturesManagePage';
import { GameweeksManagePage } from '@/pages/content/GameweeksManagePage';
import { ContentIndexRedirect, ContentLayout } from '@/pages/content/ContentLayout';
import { DashboardHomePage } from '@/pages/dashboard/DashboardHomePage';
import { IngestionControlPage } from '@/pages/ingestion/IngestionControlPage';
import { SyncHistoryPage } from '@/pages/ingestion/SyncHistoryPage';
import { LeaguesListPage } from '@/pages/leagues/LeaguesListPage';
import { LeagueDetailPage } from '@/pages/leagues/LeagueDetailPage';
import { PointsCorrectionPage } from '@/pages/scoring/PointsCorrectionPage';
import { RecalculationHistoryPage } from '@/pages/scoring/RecalculationHistoryPage';
import { ScoringIndexRedirect, ScoringLayout } from '@/pages/scoring/ScoringLayout';
import { SystemLayout, SystemIndexRedirect } from '@/pages/system/SystemLayout';
import { SystemHealthPage } from '@/pages/system/SystemHealthPage';
import { JobQueuePage } from '@/pages/system/JobQueuePage';
import { LogsViewerPage } from '@/pages/system/LogsViewerPage';
import { AlertSettingsPage } from '@/pages/system/AlertSettingsPage';
import { AuditLogPage } from '@/pages/system/AuditLogPage';
import { UsersListPage } from '@/pages/users/UsersListPage';
import { UserDetailPage } from '@/pages/users/UserDetailPage';
import { FinanceLayout, FinanceIndexRedirect } from '@/pages/finance/FinanceLayout';
import { WalletLookupPage } from '@/pages/finance/WalletLookupPage';
import { DepositQueuePage } from '@/pages/finance/DepositQueuePage';
import { WithdrawalQueuePage } from '@/pages/finance/WithdrawalQueuePage';
import { TransactionsPage } from '@/pages/finance/TransactionsPage';
import { PayoutReviewPage } from '@/pages/finance/PayoutReviewPage';
import { DisputeResolutionPage } from '@/pages/finance/DisputeResolutionPage';
import { CommissionDashboardPage } from '@/pages/finance/CommissionDashboardPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { NotificationsPage } from '@/pages/communications/NotificationsPage';
import { AnnouncementsPage } from '@/pages/communications/AnnouncementsPage';
import { SupportPage } from '@/pages/support/SupportPage';
import { AdminsPage } from '@/pages/users/AdminsPage';

export const router = createBrowserRouter([
  {
    element: <PublicOnlyAdminRoute />,
    children: [{ path: '/login', element: <AdminLoginPage /> }],
  },
  {
    element: <ProtectedAdminRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardHomePage /> },
          { path: '/ingestion', element: <IngestionControlPage /> },
          { path: '/ingestion/history', element: <SyncHistoryPage /> },
          { path: '/users', element: <UsersListPage /> },
          { path: '/admins', element: <AdminsPage /> },
          { path: '/support', element: <SupportPage /> },
          { path: '/users/:id', element: <UserDetailPage /> },
          {
            path: '/content',
            element: <ContentLayout />,
            children: [
              { index: true, element: <ContentIndexRedirect /> },
              { path: 'players', element: <PlayersManagePage /> },
              { path: 'teams', element: <RealTeamsManagePage /> },
              { path: 'fixtures', element: <FixturesManagePage /> },
              { path: 'gameweeks', element: <GameweeksManagePage /> },
            ],
          },
          {
            path: '/scoring',
            element: <ScoringLayout />,
            children: [
              { index: true, element: <ScoringIndexRedirect /> },
              { path: 'correction', element: <PointsCorrectionPage /> },
              { path: 'history', element: <RecalculationHistoryPage /> },
            ],
          },
          { path: '/leagues', element: <LeaguesListPage /> },
          { path: '/leagues/:id', element: <LeagueDetailPage /> },
          {
            path: '/finance',
            element: <FinanceLayout />,
            children: [
              { index: true, element: <FinanceIndexRedirect /> },
              { path: 'wallets', element: <WalletLookupPage /> },
              { path: 'deposits', element: <DepositQueuePage /> },
              { path: 'withdrawals', element: <WithdrawalQueuePage /> },
              { path: 'transactions', element: <TransactionsPage /> },
              { path: 'payouts', element: <PayoutReviewPage /> },
              { path: 'disputes', element: <DisputeResolutionPage /> },
              { path: 'commission', element: <CommissionDashboardPage /> },
            ],
          },
          {
            path: '/system',
            element: <SystemLayout />,
            children: [
              { index: true, element: <SystemIndexRedirect /> },
              { path: 'health', element: <SystemHealthPage /> },
              { path: 'queues', element: <JobQueuePage /> },
              { path: 'logs', element: <LogsViewerPage /> },
              { path: 'alerts', element: <AlertSettingsPage /> },
              { path: 'audit', element: <AuditLogPage /> },
            ],
          },
          { path: '/analytics', element: <AnalyticsPage /> },
          { path: '/reports', element: <ReportsPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/announcements', element: <AnnouncementsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
