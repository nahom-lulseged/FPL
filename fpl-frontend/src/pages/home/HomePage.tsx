import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Crown,
  Plus,
  Radio,
  Settings2,
  Shirt,
  Sparkles,
  Trophy,
  WalletCards,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PremiumCard } from '@/components/common/PremiumCard';
import { ClubRail } from '@/components/clubs/ClubRail';
import { ClubCrest } from '@/components/pitch/ClubCrest';
import { getCurrentGameweek } from '@/api/gameweeks.api';
import { useFixtures } from '@/hooks/useFixtures';
import { useLedgerHistory } from '@/hooks/useLedgerHistory';
import { useMyTeam } from '@/hooks/useMyTeam';
import { useStakedLeagues } from '@/hooks/useStakedLeagues';
import { useWallet } from '@/hooks/useWallet';
import { useFplOverview } from '@/hooks/useFplCatalog';
import { formatMinor } from '@/lib/money';
import { formatKickoff } from '@/lib/formatters';
import heroArtwork from '@/assets/premium-gameweek-hero.webp';

export function HomePage() {
  const { team, hasNoTeam } = useMyTeam();
  const wallet = useWallet();
  const ledger = useLedgerHistory(1, 4);
  const leagues = useStakedLeagues(1, 3);
  const fixtures = useFixtures({ page: 1, limit: 6 });
  const fplOverview = useFplOverview();
  const gameweek = useQuery({ queryKey: ['gameweeks', 'current'], queryFn: getCurrentGameweek });
  const countdown = useCountdown(gameweek.data?.deadline);
  const [leagueView, setLeagueView] = useState<'leagues' | 'cups'>('leagues');
  const liveFixtures = fixtures.data?.data.filter((fixture) => fixture.started && !fixture.finished) ?? [];
  const upcomingFixtures = fixtures.data?.data.filter((fixture) => !fixture.started).slice(0, 3) ?? [];
  const featuredLeague = leagues.data?.data[0];
  const prizePool = featuredLeague?.potTotalMinor ?? 250_000_00;
  const generalRows = leagueView === 'leagues'
    ? [
        { label: 'Ethiopia', value: 0, to: '/leaderboard?scope=ethiopia' },
        { label: `Gameweek ${gameweek.data?.number ?? 1}`, value: team?.gameweekTotal ?? 0, to: '/leaderboard' },
        { label: 'Overall', value: team?.totalPoints ?? 0, to: '/leaderboard?scope=overall' },
      ]
    : [
        { label: 'Ethiopia Cup', value: 0, to: '/leaderboard?scope=ethiopia&view=cups' },
        { label: 'Overall Cup', value: team?.totalPoints ?? 0, to: '/leaderboard?scope=overall&view=cups' },
      ];

  return (
    <div className="fpl-clone-home page-stack">
      <section
        className="fpl-manager-hero"
        style={{ '--premium-hero': `url(${heroArtwork})` } as CSSProperties}
      >
        <div className="fpl-manager-hero__deadline">
          <span className="gameweek-badge">Gameweek {gameweek.data?.number ?? 1}</span>
          <strong>{gameweek.data?.deadline ? `Deadline: ${formatDeadline(gameweek.data.deadline)}` : countdown.label}</strong>
        </div>
        <div className="fpl-manager-hero__actions">
          <Link to={hasNoTeam ? '/squad-selection' : '/my-team'}><Shirt size={22} /><span>{hasNoTeam ? 'Build Team' : 'Pick Team'}</span><ChevronRight size={19} /></Link>
          <Link to="/transfers"><ArrowLeftRight size={22} /><span>Transfers</span><ChevronRight size={19} /></Link>
        </div>
      </section>

      <ClubRail teams={fplOverview.data?.teams ?? []} viewAllLink="/premier-league" />

      <section className="fpl-leagues-panel">
        <div className="fpl-leagues-panel__heading"><h2>Leagues &amp; Cups</h2><Link to="/leagues">View all <ChevronRight size={16} /></Link></div>
        <div className="fpl-panel-tabs" role="tablist" aria-label="League standings view">
          <button
            type="button"
            role="tab"
            aria-selected={leagueView === 'leagues'}
            className={leagueView === 'leagues' ? 'is-active' : undefined}
            onClick={() => setLeagueView('leagues')}
          >
            Leagues
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={leagueView === 'cups'}
            className={leagueView === 'cups' ? 'is-active' : undefined}
            onClick={() => setLeagueView('cups')}
          >
            Cups
          </button>
        </div>
        {leagueView === 'leagues' ? (
          <div className="fpl-league-actions">
            <Link to="/leagues/join" aria-label="Join Leagues"><span className="fpl-action-icon fpl-action-icon--green"><Plus size={21} /></span><span><strong>Join League</strong><small>Join public or private leagues</small></span><ChevronRight size={19} /></Link>
            <Link to="/leagues/configure"><span className="fpl-action-icon"><Settings2 size={20} /></span><span><strong>Configure Leagues</strong><small>Manage your league settings</small></span><ChevronRight size={19} /></Link>
          </div>
        ) : null}
        <h3>{leagueView === 'leagues' ? 'General Leagues' : 'General Cups'}</h3>
        <div className="fpl-general-leagues">
          {generalRows.map((row) => (
            <Link to={row.to} key={row.label}><span>{row.label}</span><b>{row.value}</b><i /></Link>
          ))}
        </div>
        {leagueView === 'leagues' ? (
          <div className="create-league-cta">
            <span><Crown size={24} /></span>
            <div><strong>Create your league</strong><small>Invite friends and compete together</small></div>
            <Link to="/leagues/create">Create League <Plus size={18} /></Link>
          </div>
        ) : null}
      </section>

      <section className="fpl-home-secondary">
        <div className="section-heading"><h2>Your gameweek</h2><Link to="/leaderboard">Leaderboard <ChevronRight size={14} /></Link></div>
        <div className="metric-grid">
          <MetricCard icon={WalletCards} label="Balance" value={wallet.data?.balanceDisplay ?? 'ETB 0.00'} accent="green" />
          <MetricCard icon={Trophy} label="Weekly prize" value={formatMinor(prizePool)} accent="cyan" />
          <MetricCard icon={Crown} label="Current rank" value="#1,248" change="Up 126" />
          <MetricCard icon={Sparkles} label="Total points" value={String(team?.totalPoints ?? 0)} change="Top 18%" />
        </div>
      </section>

      <div className="dashboard-grid fpl-home-secondary">
        <div className="page-stack">
          <section>
            <div className="section-heading"><h2>Live now</h2><Link to="/match-center">Match center <ChevronRight size={14} /></Link></div>
            <div className="horizontal-cards">
              {(liveFixtures.length ? liveFixtures : fixtures.data?.data.slice(0, 2) ?? []).map((fixture) => (
                <Link to={`/matches/${fixture.id}`} key={fixture.id} className="match-mini-card">
                  <div><span className="live-indicator"><Radio size={12} /> {fixture.started ? `${fixture.minutes ?? 0}' LIVE` : 'UPCOMING'}</span><small>Premier League</small></div>
                  <div className="match-mini-card__score"><span><ClubCrest shortName={fixture.homeTeam.shortName} />{fixture.homeTeam.shortName}</span><strong>{fixture.started ? `${fixture.homeScore ?? 0} - ${fixture.awayScore ?? 0}` : 'VS'}</strong><span><ClubCrest shortName={fixture.awayTeam.shortName} />{fixture.awayTeam.shortName}</span></div>
                  <ChevronRight size={16} />
                </Link>
              ))}
              {!fixtures.isLoading && !fixtures.data?.data.length ? <EmptyStrip label="No matches scheduled yet" /> : null}
            </div>
          </section>

          <section>
            <div className="section-heading"><h2>Upcoming fixtures</h2><Link to="/match-center">Full schedule <ChevronRight size={14} /></Link></div>
            <PremiumCard className="fixture-list-card">
              {upcomingFixtures.map((fixture) => <div className="fixture-row" key={fixture.id}><div><ClubCrest shortName={fixture.homeTeam.shortName} className="fixture-row__crest" /><span><strong>{fixture.homeTeam.shortName} vs {fixture.awayTeam.shortName}</strong><small>{formatKickoff(fixture.kickoffTime)}</small></span><ClubCrest shortName={fixture.awayTeam.shortName} className="fixture-row__crest" /></div><span className="difficulty-chip">FDR {Math.max(fixture.homeDifficulty ?? 3, fixture.awayDifficulty ?? 3)}</span></div>)}
              {!upcomingFixtures.length ? <div className="fixture-row fixture-row--empty">Fixture schedule unavailable</div> : null}
            </PremiumCard>
          </section>
        </div>

        <aside className="dashboard-aside page-stack">
          <section><div className="section-heading"><h2>Quick actions</h2></div><div className="quick-action-grid"><QuickAction to="/wallet?deposit=open" icon={ArrowDownLeft} label="Deposit" /><QuickAction to="/wallet?withdraw=open" icon={ArrowUpRight} label="Withdraw" /><QuickAction to="/leagues" icon={Trophy} label="Join league" /><QuickAction to="/transfers" icon={CircleDollarSign} label="Transfer" /></div></section>
          <section><div className="section-heading"><h2>Recent activity</h2><Link to="/wallet">Wallet <ChevronRight size={14} /></Link></div><PremiumCard className="activity-card">{(ledger.data?.data ?? []).slice(0, 4).map((entry) => <div className="activity-row" key={entry.id}><span className={entry.direction === 'CREDIT' ? 'activity-icon activity-icon--credit' : 'activity-icon'}>{entry.direction === 'CREDIT' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><div><strong>{entry.description ?? entry.entryType.replaceAll('_', ' ')}</strong><small>{new Date(entry.createdAt).toLocaleDateString()}</small></div><b className={entry.direction === 'CREDIT' ? 'is-credit' : ''}>{entry.direction === 'CREDIT' ? '+' : '-'}{formatMinor(entry.amountMinor)}</b></div>)}{!ledger.data?.data.length ? <p className="activity-empty">Your wallet activity will appear here.</p> : null}</PremiumCard></section>
        </aside>
      </div>

      <section className="fpl-news-card"><div><small>FANTASY NEWS</small><h2>Fantasy news and tips</h2><p>Team news, form guides and deadline advice.</p></div><Link to="/notifications">See all <ChevronRight size={18} /></Link></section>
    </div>
  );
}

function useCountdown(deadline?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  return useMemo(() => {
    if (!deadline) return { label: 'Deadline to be announced' };
    const diff = Math.max(0, new Date(deadline).getTime() - now);
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    return { label: `${days}d ${hours}h ${minutes}m remaining` };
  }, [deadline, now]);
}

function formatDeadline(value: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('weekday')} ${get('day')} ${get('month')} at ${get('hour')}:${get('minute')}`;
}

function MetricCard({ icon: Icon, label, value, change, accent }: { icon: typeof WalletCards; label: string; value: string; change?: string; accent?: 'green' | 'cyan' }) {
  return <PremiumCard className={`metric-card ${accent ? `metric-card--${accent}` : ''}`}><Icon size={18} /><small>{label}</small><strong>{value}</strong>{change ? <span>{change}</span> : null}</PremiumCard>;
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof WalletCards; label: string }) {
  return <Link to={to} className="quick-action"><span><Icon size={20} /></span><strong>{label}</strong></Link>;
}

function EmptyStrip({ label }: { label: string }) {
  return <div className="empty-strip"><Clock3 size={18} /><span>{label}</span></div>;
}
