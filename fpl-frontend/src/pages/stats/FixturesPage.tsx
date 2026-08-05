import { Link, useSearchParams } from 'react-router-dom';
import { ClubRail } from '@/components/clubs/ClubRail';
import { ClubCrest } from '@/components/pitch/ClubCrest';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { FullPageSpinner } from '@/components/common/Spinner';
import { useFixtures } from '@/hooks/useFixtures';
import { useLiveGameweek } from '@/hooks/useLiveGameweek';
import { useFplOverview } from '@/hooks/useFplCatalog';
import { useGameweekStore } from '@/store/gameweekStore';
import { formatKickoff } from '@/lib/formatters';
import type { FixtureListItem } from '@/types/fixture';

function FdrBadge({ value }: { value: number | null | undefined }) {
  const fdr = value ?? 3;
  const colors: Record<number, string> = {
    1: 'bg-emerald-600',
    2: 'bg-lime-600',
    3: 'bg-yellow-600',
    4: 'bg-orange-600',
    5: 'bg-red-600',
  };

  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white ${colors[fdr] ?? colors[3]}`}
    >
      {fdr}
    </span>
  );
}

function FixtureRow({ fixture }: { fixture: FixtureListItem }) {
  const showScore = fixture.started || fixture.finished;
  const isLive = fixture.started && !fixture.finished;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 border-b border-white/10 px-4 py-3 last:border-b-0">
      <div className="text-right">
        <ClubCrest shortName={fixture.homeTeam.shortName} className="fixture-page-crest" />
        <p className="font-semibold text-white">{fixture.homeTeam.shortName}</p>
        <p className="text-xs text-white/50">{fixture.homeTeam.name}</p>
      </div>
      <div className="min-w-[5.5rem] text-center">
        {showScore ? (
          <>
            <p className="text-lg font-bold text-white">
              {fixture.homeScore ?? 0} - {fixture.awayScore ?? 0}
            </p>
            {isLive ? (
              <p className="text-xs font-semibold text-fpl-cyan">
                LIVE{fixture.minutes != null ? ` ${fixture.minutes}'` : ''}
              </p>
            ) : fixture.finished ? (
              <p className="text-xs text-white/50">FT</p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-white/70">{formatKickoff(fixture.kickoffTime)}</p>
        )}
      </div>
      <div>
        <ClubCrest shortName={fixture.awayTeam.shortName} className="fixture-page-crest" />
        <p className="font-semibold text-white">{fixture.awayTeam.shortName}</p>
        <p className="text-xs text-white/50">{fixture.awayTeam.name}</p>
      </div>
      <div className="flex flex-col items-center gap-1">
        <FdrBadge value={fixture.homeDifficulty} />
        <FdrBadge value={fixture.awayDifficulty} />
      </div>
    </div>
  );
}

export function FixturesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedClub = searchParams.get('club');
  const selectedGameweekNumber = useGameweekStore((state) => state.selectedGameweekNumber);
  const currentGameweek = useGameweekStore((state) => state.currentGameweek);
  const gameweek = selectedGameweekNumber ?? currentGameweek?.number;

  useLiveGameweek(gameweek, true);

  const { data, isLoading, isError, error, refetch } = useFixtures({
    gameweek,
    limit: 50,
  });
  const fplOverview = useFplOverview();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (isError) {
    return <QueryErrorState error={error} onRetry={() => void refetch()} />;
  }

  const fixtures = (data?.data ?? []).filter((fixture) => !selectedClub
    || fixture.homeTeam.shortName === selectedClub
    || fixture.awayTeam.shortName === selectedClub);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Fixtures</h1>
          <p className="mt-1 text-sm text-white/60">
            Gameweek {gameweek ?? '—'} fixtures with fixture difficulty ratings (FDR).
          </p>
        </div>
        <Link to="/stats/dream-team" className="text-sm font-medium text-fpl-cyan hover:underline">
          View Dream Team
        </Link>
      </div>

      <ClubRail
        teams={fplOverview.data?.teams ?? []}
        selected={selectedClub}
        onSelect={(shortName) => {
          const next = new URLSearchParams(searchParams);
          if (shortName) next.set('club', shortName);
          else next.delete('club');
          setSearchParams(next, { replace: true });
        }}
        viewAllLink="/premier-league"
      />

      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
        {fixtures.length === 0 ? (
          <p className="px-4 py-8 text-center text-white/60">No fixtures for this gameweek.</p>
        ) : (
          fixtures.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} />)
        )}
      </div>
    </div>
  );
}
