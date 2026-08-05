import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TeamPageSkeleton } from '@/components/common/Skeleton';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { SquadPicker } from '@/components/squad/SquadPicker';
import { getTransferWindow } from '@/api/gameweeks.api';
import { useMyTeam } from '@/hooks/useMyTeam';

export function TransfersPage() {
  const navigate = useNavigate();
  const { team, isLoading, isError, error, hasNoTeam, refetch } = useMyTeam();
  const {
    data: transferWindow,
    isLoading: isTransferWindowLoading,
    isError: isTransferWindowError,
    error: transferWindowError,
    refetch: refetchTransferWindow,
  } = useQuery({
    queryKey: ['gameweeks', 'transfer-window'],
    queryFn: getTransferWindow,
  });

  if (isError) {
    return <QueryErrorState error={error} message="Failed to load your team" onRetry={() => void refetch()} />;
  }

  if (isLoading || isTransferWindowLoading) {
    return <TeamPageSkeleton />;
  }

  if (hasNoTeam || !team) {
    return <Navigate to="/squad-selection" replace />;
  }

  if (isTransferWindowError) {
    return (
      <QueryErrorState
        error={transferWindowError}
        message="Failed to load the transfer window"
        onRetry={() => void refetchTransferWindow()}
      />
    );
  }

  if (!transferWindow?.isOpen || !transferWindow.gameweek) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-white">Transfers</h1>
        <p className="text-white/60">
          Transfers are closed because there is no future gameweek deadline available.
        </p>
        <Link to="/my-team" className="text-fpl-green underline">
          View My Team
        </Link>
      </div>
    );
  }

  return (
    <SquadPicker
      mode={{ mode: 'transfer', team }}
      selectedGameweek={transferWindow.gameweek}
      onCompleted={async () => {
        await refetch();
        navigate('/my-team', { replace: true });
      }}
    />
  );
}
