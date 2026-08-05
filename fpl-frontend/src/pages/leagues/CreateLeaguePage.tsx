import { Link, useNavigate } from 'react-router-dom';
import { CreateLeagueForm } from '@/components/league/CreateLeagueForm';
import { FullPageSpinner } from '@/components/common/Spinner';
import { useMyTeam } from '@/hooks/useMyTeam';

export function CreateLeaguePage() {
  const navigate = useNavigate();
  const { hasNoTeam, isLoading } = useMyTeam();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (hasNoTeam) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-white">Create league</h1>
        <p className="text-white/60">Create your squad before creating a league.</p>
        <Link
          to="/squad-selection"
          className="inline-block rounded-md bg-fpl-green px-4 py-2 font-semibold text-fpl-purple"
        >
          Build your squad
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link to="/leagues" className="text-sm text-fpl-green hover:underline">
          ← Back to leagues
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Create league</h1>
        <p className="mt-1 text-sm text-white/60">Start a classic mini-league for your friends.</p>
      </div>

      <div className="rounded-lg border border-white/10 bg-fpl-purple/40 p-4">
        <CreateLeagueForm onSuccess={(id) => navigate(`/leagues/${id}`)} />
      </div>
    </div>
  );
}
