import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Radio, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PremiumCard } from '@/components/common/PremiumCard';
import { FullPageSpinner } from '@/components/common/Spinner';
import { ClubCrest } from '@/components/pitch/ClubCrest';
import { useFixtures } from '@/hooks/useFixtures';
import { formatKickoff } from '@/lib/formatters';

type Filter = 'all' | 'live' | 'upcoming' | 'finished';

export function MatchCenterPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const fixtures = useFixtures({ page: 1, limit: 50 });
  const rows = useMemo(() => (fixtures.data?.data ?? []).filter((fixture) => {
    if (filter === 'live') return fixture.started && !fixture.finished;
    if (filter === 'upcoming') return !fixture.started;
    if (filter === 'finished') return fixture.finished;
    return true;
  }), [filter, fixtures.data?.data]);

  return (
    <div className="page-stack match-center-page">
      <header className="page-intro">
        <div><p className="eyebrow">PREMIER LEAGUE</p><h1>Match Center</h1><p>Live scores, fantasy impact, and verified match data.</p></div>
        <span className="data-status"><Radio size={14} /> Live feed</span>
      </header>
      <div className="segmented-control" role="tablist" aria-label="Match filter">
        {(['all', 'live', 'upcoming', 'finished'] as Filter[]).map((item) => <button key={item} role="tab" aria-selected={filter === item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item}</button>)}
      </div>
      <div className="match-list">
        {rows.map((fixture) => (
          <Link to={`/matches/${fixture.id}`} key={fixture.id}>
            <PremiumCard className="match-card">
              <div className="match-card__meta">
                <span className={fixture.started && !fixture.finished ? 'live-indicator' : ''}>{fixture.started && !fixture.finished ? <><Radio size={12} /> {fixture.minutes ?? 0}' LIVE</> : fixture.finished ? 'FULL TIME' : formatKickoff(fixture.kickoffTime)}</span>
                <small>GW {fixture.gameweek.number}</small>
              </div>
              <div className="match-card__teams">
                <div><ClubCrest shortName={fixture.homeTeam.shortName} className="match-card__crest" /><strong>{fixture.homeTeam.name}</strong></div>
                <span className="match-card__result">{fixture.started || fixture.finished ? <><b>{fixture.homeScore ?? 0}</b><em>:</em><b>{fixture.awayScore ?? 0}</b></> : <small>VS</small>}</span>
                <div><ClubCrest shortName={fixture.awayTeam.shortName} className="match-card__crest" /><strong>{fixture.awayTeam.name}</strong></div>
              </div>
              <div className="match-card__footer"><span><SlidersHorizontal size={14} /> Fantasy impact</span><span>Details <ChevronRight size={14} /></span></div>
            </PremiumCard>
          </Link>
        ))}
        {fixtures.isLoading ? <FullPageSpinner /> : null}
        {!fixtures.isLoading && rows.length === 0 ? <PremiumCard className="match-empty"><CalendarDays size={30} /><h2>No matches here yet</h2><p>Try another filter or check back when the next gameweek is published.</p></PremiumCard> : null}
      </div>
    </div>
  );
}
