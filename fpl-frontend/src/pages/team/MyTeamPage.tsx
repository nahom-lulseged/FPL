import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTransferWindow } from '@/api/gameweeks.api';
import { TeamPageSkeleton } from '@/components/common/Skeleton';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { SavedTeamView } from '@/components/team/SavedTeamView';
import { useMyTeam } from '@/hooks/useMyTeam';
import { useTeamGameweekBreakdown } from '@/hooks/useTeamGameweekBreakdown';
import { useGameweekStore } from '@/store/gameweekStore';

export function MyTeamPage() {
  const selectedGameweekNumber = useGameweekStore((s) => s.selectedGameweekNumber);
  const currentGameweek = useGameweekStore((s) => s.currentGameweek);
  const gameweeks = useGameweekStore((s) => s.gameweeks);

  const selectedGameweek =
    gameweeks.find((gw) => gw.number === selectedGameweekNumber) ?? currentGameweek;

  const transferWindowQuery = useQuery({
    queryKey: ['gameweeks', 'transfer-window'],
    queryFn: getTransferWindow,
    staleTime: 30_000,
  });

  const explicitlyHistorical = selectedGameweek?.status === 'FINISHED';
  const editableGameweek = transferWindowQuery.data?.isOpen
    ? transferWindowQuery.data.gameweek
    : null;
  const displayGameweek = explicitlyHistorical
    ? selectedGameweek
    : editableGameweek ?? selectedGameweek;

  const isHistoricalView = Boolean(displayGameweek?.status === 'FINISHED');

  const useBreakdownForStats = Boolean(
    displayGameweek && displayGameweek.status !== 'UPCOMING',
  );

  const { team, isLoading, isError, error, hasNoTeam, refetch } = useMyTeam(
    undefined,
    displayGameweek?.number ?? selectedGameweekNumber ?? undefined,
  );

  const { data: gameweekDetail, isLoading: breakdownLoading } = useTeamGameweekBreakdown(
    team?.id,
    displayGameweek?.number ?? selectedGameweekNumber ?? undefined,
    isHistoricalView || useBreakdownForStats,
    displayGameweek?.status,
  );

  if (isError) {
    return <QueryErrorState error={error} message="Failed to load your team" onRetry={() => void refetch()} />;
  }

  if (
    isLoading ||
    transferWindowQuery.isLoading ||
    (team && (isHistoricalView || useBreakdownForStats) && breakdownLoading)
  ) {
    return <TeamPageSkeleton />;
  }

  if (hasNoTeam || !team) {
    return <Navigate to="/squad-selection" replace />;
  }

  const gameweekStatus = displayGameweek?.status ?? team.gameweek?.status ?? currentGameweek?.status;
  const canEdit = gameweekStatus === 'UPCOMING' && !isHistoricalView;

  return (
    <SavedTeamView
      team={team}
      canEdit={canEdit}
      onUpdated={() => refetch()}
      gameweekDetail={gameweekDetail}
      isHistoricalView={isHistoricalView}
      selectedGameweek={displayGameweek}
      currentGameweekNumber={currentGameweek?.number ?? null}
      transferWindowError={transferWindowQuery.isError ? transferWindowQuery.error : null}
      onRetryTransferWindow={() => void transferWindowQuery.refetch()}
    />
  );
}
