import { useMemo } from 'react';
import { BarChart3, CircleOff, Clock3, Radio } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { PremiumCard } from '@/components/common/PremiumCard';
import { FullPageSpinner } from '@/components/common/Spinner';
import { useFixtures } from '@/hooks/useFixtures';
import { formatKickoff } from '@/lib/formatters';

export function MatchDetailPage() {
  const { id } = useParams();
  const fixtures = useFixtures({ page: 1, limit: 100 });
  const fixture = useMemo(() => fixtures.data?.data.find((item) => item.id === id), [fixtures.data?.data, id]);

  if (fixtures.isLoading) return <FullPageSpinner />;
  if (!fixture) return <PremiumCard className="match-empty"><CircleOff size={30} /><h2>Match unavailable</h2><p>This fixture could not be found.</p></PremiumCard>;

  return (
    <div className="page-stack match-detail-page">
      <PremiumCard className="match-score-hero premium-card--glow">
        <div className="match-score-hero__status">{fixture.started && !fixture.finished ? <span className="live-indicator"><Radio size={13} /> {fixture.minutes ?? 0}' LIVE</span> : <span><Clock3 size={13} /> {formatKickoff(fixture.kickoffTime)}</span>}<small>GAMEWEEK {fixture.gameweek.number}</small></div>
        <div className="match-score-hero__teams">
          <div><span className="club-monogram club-monogram--large">{fixture.homeTeam.shortName.slice(0, 2)}</span><strong>{fixture.homeTeam.name}</strong><small>HOME</small></div>
          <div className="match-score-hero__result">{fixture.started || fixture.finished ? <strong>{fixture.homeScore ?? 0} <i>:</i> {fixture.awayScore ?? 0}</strong> : <strong>VS</strong>}<span>{fixture.finished ? 'Full time' : fixture.started ? 'In play' : 'Not started'}</span></div>
          <div><span className="club-monogram club-monogram--large club-monogram--away">{fixture.awayTeam.shortName.slice(0, 2)}</span><strong>{fixture.awayTeam.name}</strong><small>AWAY</small></div>
        </div>
      </PremiumCard>

      <section><div className="section-heading"><h2>Match statistics</h2><span className="provider-chip">Verified feed</span></div><PremiumCard className="advanced-data-empty"><BarChart3 size={28} /><h3>Advanced data not connected</h3><p>Possession, xG, shots, corners, cards, and the event timeline will appear when a licensed match-data provider is configured.</p><div className="basic-stat-row"><span>{fixture.homeDifficulty ?? '—'}</span><small>FIXTURE DIFFICULTY</small><span>{fixture.awayDifficulty ?? '—'}</span></div></PremiumCard></section>
      <section><div className="section-heading"><h2>Fantasy bonus</h2></div><PremiumCard className="advanced-data-empty advanced-data-empty--compact"><CircleOff size={22} /><p>Provisional bonus points are unavailable for this fixture.</p></PremiumCard></section>
    </div>
  );
}
