import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { FullPageSpinner } from '@/components/common/Spinner';
import { ClubCrest } from '@/components/pitch/ClubCrest';
import { useFixtures } from '@/hooks/useFixtures';
import { formatFixtureDate, formatKickoffTime } from '@/lib/squadFixtureDisplay';
import { useGameweekStore } from '@/store/gameweekStore';
import type { FixtureListItem } from '@/types/fixture';
import type { Gameweek } from '@/types/gameweek';

interface SquadBuilderFixturesProps {
  selectedGameweek?: Gameweek | null;
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M5.5 2.5v3M14.5 2.5v3M3.5 7h13M4 4.5h12v12H4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13.5 11h-3M12 9.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconChevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M12.5 4.5 7 10l5.5 5.5' : 'M7.5 4.5 13 10l-5.5 5.5'}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function groupFixtures(fixtures: FixtureListItem[]) {
  const groups = new Map<string, FixtureListItem[]>();
  for (const fixture of fixtures) {
    const key = formatFixtureDate(fixture.kickoffTime);
    groups.set(key, [...(groups.get(key) ?? []), fixture]);
  }
  return Array.from(groups.entries());
}

function statusText(fixture: FixtureListItem): string {
  if (fixture.finished) {
    return `${fixture.homeScore ?? 0} - ${fixture.awayScore ?? 0}`;
  }
  if (fixture.started) {
    return `${fixture.homeScore ?? 0} - ${fixture.awayScore ?? 0}${fixture.minutes != null ? ` ${fixture.minutes}'` : ''}`;
  }
  return formatKickoffTime(fixture.kickoffTime);
}

function FixtureRow({ fixture }: { fixture: FixtureListItem }) {
  const status = fixture.finished ? 'FT' : fixture.started ? 'LIVE' : null;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 border-b border-white/10 py-4 last:border-b-0">
      <div className="flex items-center justify-end gap-2 text-right">
        <span className="font-extrabold text-white">{fixture.homeTeam.shortName}</span>
        <ClubCrest shortName={fixture.homeTeam.shortName} />
      </div>
      <div className="min-w-[5.5rem] text-center">
        <p className="text-base font-extrabold tabular-nums text-white">{statusText(fixture)}</p>
        {status ? <p className="text-[11px] font-bold text-fpl-cyan">{status}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <ClubCrest shortName={fixture.awayTeam.shortName} />
        <span className="font-extrabold text-white">{fixture.awayTeam.shortName}</span>
      </div>
      <div className="hidden min-w-[4.5rem] text-right text-xs font-bold text-white/55 sm:block">
        FDR {fixture.homeDifficulty ?? '-'} / {fixture.awayDifficulty ?? '-'}
      </div>
    </div>
  );
}

export function SquadBuilderFixtures({ selectedGameweek }: SquadBuilderFixturesProps) {
  const navigate = useNavigate();
  const gameweeks = useGameweekStore((s) => s.gameweeks);
  const currentGameweek = useGameweekStore((s) => s.currentGameweek);
  const initialNumber = selectedGameweek?.number ?? currentGameweek?.number ?? 1;
  const [localGameweek, setLocalGameweek] = useState(initialNumber);

  const sortedGameweeks = useMemo(
    () => [...gameweeks].sort((a, b) => a.number - b.number),
    [gameweeks],
  );
  const minGw = sortedGameweeks[0]?.number ?? localGameweek;
  const maxGw = sortedGameweeks[sortedGameweeks.length - 1]?.number ?? localGameweek;
  const displayGameweek = sortedGameweeks.find((gw) => gw.number === localGameweek);

  const { data, isLoading, isError, error, refetch } = useFixtures({
    gameweek: localGameweek,
    limit: 50,
  });

  const fixtures = data?.data ?? [];
  const grouped = groupFixtures(fixtures);
  const deadlineText = displayGameweek
    ? new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(displayGameweek.deadline))
    : 'Pending';

  return (
    <section className="squad-fixtures-card" aria-labelledby="squad-fixtures-title">
      <div className="flex items-start justify-between gap-4">
        <h2 id="squad-fixtures-title" className="squad-builder-heading text-white">
          Fixtures
        </h2>
        <button
          type="button"
          onClick={() => navigate('/fixtures')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#5b0b67] text-white transition hover:bg-[#6f1a7d] focus:outline-none focus:ring-2 focus:ring-fpl-cyan"
          aria-label="Open fixtures page"
        >
          <IconCalendar />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <button
          type="button"
          disabled={localGameweek <= minGw}
          onClick={() => setLocalGameweek((value) => Math.max(minGw, value - 1))}
          className="fixture-nav-button"
          aria-label="Previous gameweek fixtures"
        >
          <IconChevron direction="left" />
        </button>
        <div className="text-center">
          <p className="text-xl font-extrabold text-white">Gameweek {localGameweek}</p>
          <p className="text-sm font-bold text-white/70">Deadline: {deadlineText}</p>
        </div>
        <button
          type="button"
          disabled={localGameweek >= maxGw}
          onClick={() => setLocalGameweek((value) => Math.min(maxGw, value + 1))}
          className="fixture-nav-button"
          aria-label="Next gameweek fixtures"
        >
          <IconChevron direction="right" />
        </button>
      </div>

      {isLoading ? (
        <div className="mt-6">
          <FullPageSpinner />
        </div>
      ) : null}

      {isError ? (
        <div className="mt-6">
          <QueryErrorState
            error={error}
            message="Failed to load fixtures"
            onRetry={() => void refetch()}
          />
        </div>
      ) : null}

      {!isLoading && !isError && fixtures.length === 0 ? (
        <p className="mt-6 rounded-lg bg-white/6 px-4 py-8 text-center text-white/60">
          No fixtures are available for this gameweek.
        </p>
      ) : null}

      {!isLoading && !isError && grouped.length > 0 ? (
        <div className="mt-6 space-y-5">
          {grouped.map(([date, dateFixtures]) => (
            <section key={date}>
              <h3 className="mb-2 text-xl font-extrabold text-white">{date}</h3>
              <div className="mx-auto max-w-3xl">
                {dateFixtures.map((fixture) => (
                  <FixtureRow key={fixture.id} fixture={fixture} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </section>
  );
}
