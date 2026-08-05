import { CalendarDays, Database, Radio, Trophy, Users } from 'lucide-react';
import { ClubCrest } from '@/components/pitch/ClubCrest';
import { ClubRail } from '@/components/clubs/ClubRail';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { FullPageSpinner } from '@/components/common/Spinner';
import { useFplFixtures, useFplOverview, useFplPlayers } from '@/hooks/useFplCatalog';
import { formatKickoff } from '@/lib/formatters';

export function PremierLeagueDataPage() {
  const overview = useFplOverview();
  const currentGameweek = overview.data?.currentGameweek?.id ?? overview.data?.nextGameweek?.id;
  const players = useFplPlayers({ limit: 10, sortBy: 'total_points', sortDir: 'desc' });
  const fixtures = useFplFixtures({ gameweek: currentGameweek });

  if (overview.isError) {
    return <QueryErrorState error={overview.error} onRetry={() => void overview.refetch()} />;
  }

  const teams = overview.data?.teams ?? [];

  return (
    <div className="page-stack official-data-page">
      <header className="page-intro official-data-page__header">
        <div>
          <p className="eyebrow">LIVE DATA HUB</p>
          <h1>Premier League</h1>
          <p>Clubs, table, players and fixtures supplied through the cached FPL feed.</p>
        </div>
        <span className="data-status"><Radio size={14} /> FPL connected</span>
      </header>

      <div className="official-data-stats" aria-label="FPL data totals">
        <DataStat icon={Trophy} label="Clubs" value={overview.data?.counts.teams ?? 20} />
        <DataStat icon={Users} label="Players" value={overview.data?.counts.players ?? 0} />
        <DataStat icon={CalendarDays} label="Fixtures" value={overview.data?.counts.fixtures ?? 0} />
        <DataStat icon={Database} label="Gameweeks" value={overview.data?.counts.gameweeks ?? 38} />
      </div>

      <ClubRail teams={teams} />

      <div className="official-data-grid">
        <section className="official-table-section" aria-labelledby="league-table-title">
          <div className="section-heading"><h2 id="league-table-title">League table</h2><small>Updated from FPL</small></div>
          <div className="official-league-table">
            <div className="official-league-table__head"><span>#</span><span>Club</span><span>P</span><span>GD</span><span>Pts</span></div>
            {teams.map((team, index) => (
              <div className="official-league-table__row" key={team.id}>
                <b>{team.position ?? index + 1}</b>
                <span><ClubCrest shortName={team.shortName} /><strong>{team.name}</strong></span>
                <span>{team.played ?? 0}</span>
                <span>{Number(team.win ?? 0) - Number(team.loss ?? 0)}</span>
                <strong>{team.points ?? 0}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="official-players-section" aria-labelledby="top-players-title">
          <div className="section-heading"><h2 id="top-players-title">Top fantasy players</h2><small>Total points</small></div>
          <div className="official-player-list">
            {(players.data?.data ?? []).map((player, index) => (
              <div className="official-player-row" key={player.id}>
                <b>{index + 1}</b>
                {player.teamDetails ? <ClubCrest shortName={player.teamDetails.shortName} /> : <span />}
                <span><strong>{player.web_name}</strong><small>{player.position} · Fantasy price £{player.price.toFixed(1)}m</small></span>
                <strong>{player.total_points}</strong>
              </div>
            ))}
            {players.isLoading ? <FullPageSpinner /> : null}
          </div>
        </section>
      </div>

      <section className="official-fixtures-section" aria-labelledby="official-fixtures-title">
        <div className="section-heading"><h2 id="official-fixtures-title">Gameweek {currentGameweek ?? 'fixtures'}</h2><small>{fixtures.data?.total ?? 0} matches</small></div>
        <div className="official-fixture-grid">
          {(fixtures.data?.data ?? []).map((fixture) => (
            <article className="official-fixture" key={fixture.id}>
              <time>{formatKickoff(fixture.kickoff_time)}</time>
              <div><span><ClubCrest shortName={fixture.homeTeam?.shortName ?? 'HOME'} /><strong>{fixture.homeTeam?.shortName ?? 'TBC'}</strong></span><b>{fixture.started || fixture.finished ? fixture.team_h_score ?? 0 : '–'}</b></div>
              <div><span><ClubCrest shortName={fixture.awayTeam?.shortName ?? 'AWAY'} /><strong>{fixture.awayTeam?.shortName ?? 'TBC'}</strong></span><b>{fixture.started || fixture.finished ? fixture.team_a_score ?? 0 : '–'}</b></div>
            </article>
          ))}
          {!fixtures.isLoading && !fixtures.data?.data.length ? <p className="official-data-empty">No fixtures are published for this gameweek yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

function DataStat({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: number }) {
  return <div><Icon size={18} /><span><small>{label}</small><strong>{value.toLocaleString()}</strong></span></div>;
}
