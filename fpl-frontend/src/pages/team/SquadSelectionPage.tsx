import { Navigate, useNavigate } from 'react-router-dom';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { TeamPageSkeleton } from '@/components/common/Skeleton';
import { SquadPicker } from '@/components/squad/SquadPicker';
import { useMyTeam } from '@/hooks/useMyTeam';
import { useGameweekStore } from '@/store/gameweekStore';

export function SquadSelectionPage() {
  const navigate = useNavigate();
  const selectedGameweekNumber = useGameweekStore((s) => s.selectedGameweekNumber);
  const currentGameweek = useGameweekStore((s) => s.currentGameweek);
  const gameweeks = useGameweekStore((s) => s.gameweeks);

  const selectedGameweek =
    gameweeks.find((gw) => gw.number === selectedGameweekNumber) ?? currentGameweek;

  const { team, isLoading, isError, error, hasNoTeam, refetch } = useMyTeam(
    undefined,
    selectedGameweekNumber ?? undefined,
  );

  if (isError) {
    return (
      <QueryErrorState
        error={error}
        message="Failed to check your squad"
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading) {
    return <TeamPageSkeleton />;
  }

  if (!hasNoTeam && team) {
    return <Navigate to="/my-team" replace />;
  }

  return (
    <SquadPicker
      mode={{ mode: 'build' }}
      selectedGameweek={selectedGameweek}
      onCompleted={async () => {
        await refetch();
        navigate('/my-team', { replace: true });
      }}
    />
  );
}
