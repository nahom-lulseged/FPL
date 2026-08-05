import { Navigate } from 'react-router-dom';
import { TeamPageSkeleton } from '@/components/common/Skeleton';
import { useMyTeam } from '@/hooks/useMyTeam';

export function TeamHubPage() {
  const { hasNoTeam, isLoading } = useMyTeam();
  if (isLoading) return <TeamPageSkeleton />;
  return <Navigate to={hasNoTeam ? '/squad-selection' : '/my-team'} replace />;
}
