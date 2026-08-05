import { useState } from 'react';
import { ChevronRight, CircleHelp, Crown, Plus, RefreshCw, Settings2, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { FullPageSpinner } from '@/components/common/Spinner';
import { LeagueCard } from '@/components/league/LeagueCard';
import { useMyLeagues } from '@/hooks/useMyLeagues';
import { useMyTeam } from '@/hooks/useMyTeam';

export function LeaguesListPage() {
  const [section, setSection] = useState<'leagues' | 'cups'>('leagues');
  const { hasNoTeam, isLoading: teamLoading } = useMyTeam();
  const mine = useMyLeagues();

  if (teamLoading || mine.isLoading) return <FullPageSpinner />;
  if (hasNoTeam) return <div className="league-empty-state league-empty-state--page"><Trophy size={34} /><h1>Build your squad first</h1><p>Your team is required before entering a league.</p><Link to="/squad-selection" className="neo-button">Build team</Link></div>;

  const leagues = mine.data?.data ?? [];
  return <div className="fpl-leagues-screen page-stack">
    <header className="fpl-screen-heading"><span /><h1>Leagues &amp; Cups</h1><button type="button" aria-label="League help"><CircleHelp size={23} /></button></header>
    <section className="fpl-leagues-dashboard">
      <div className="fpl-panel-tabs fpl-panel-tabs--large" role="tablist">
        <button className={section === 'leagues' ? 'is-active' : ''} onClick={() => setSection('leagues')}>Leagues</button>
        <button className={section === 'cups' ? 'is-active' : ''} onClick={() => setSection('cups')}>Cups</button>
      </div>
      {section === 'leagues' ? <>
        <div className="fpl-league-dashboard-actions">
          <Link to="/leagues/join"><span className="league-action-icon league-action-icon--green"><Plus size={22} /></span><span><strong>Join a League</strong><small>Use an invite code or discover competitions</small></span><ChevronRight size={19} /></Link>
          <Link to="/leagues/configure"><span className="league-action-icon"><Settings2 size={21} /></span><span><strong>Configure Leagues</strong><small>Manage invitations and league settings</small></span><ChevronRight size={19} /></Link>
          <button type="button" onClick={() => void mine.refetch()}><span className="league-action-icon"><RefreshCw size={20} /></span><span><strong>Renew Your Leagues</strong><small>Refresh rankings and membership</small></span><ChevronRight size={19} /></button>
        </div>
        <div className="fpl-league-list-heading"><div><h2>My Leagues</h2><p>{leagues.length ? `${leagues.length} active competition${leagues.length === 1 ? '' : 's'}` : 'Your private and public competitions'}</p></div><Link to="/leagues/configure">View all <ChevronRight size={15} /></Link></div>
        {mine.isError ? <QueryErrorState error={mine.error} message="Failed to load leagues" onRetry={() => void mine.refetch()} /> : null}
        <div className="league-card-list">{leagues.map((league) => <LeagueCard key={league.id} league={league} />)}{!leagues.length ? <div className="league-list-empty">No individual classic leagues joined yet.</div> : null}</div>
        <div className="fpl-general-standings"><h2>General Leagues</h2><div className="fpl-general-table"><span>League</span><span>Current Rank</span><span>Last Rank</span><strong>Ethiopia</strong><b>–</b><b>–</b><strong>Gameweek 1</strong><b>–</b><b>–</b><strong>Overall</strong><b>–</b><b>–</b></div></div>
        <div className="league-create-cta"><span><Crown size={25} /></span><div><strong>Create your league</strong><small>Invite friends and compete together</small></div><Link to="/leagues/create">Create League <Plus size={18} /></Link></div>
      </> : <div className="fpl-cups-empty"><Trophy size={42} /><h2>General Cups</h2><p>Your cup fixtures will appear once the competition is scheduled.</p><div><span>Ethiopia</span><span>Overall</span></div></div>}
    </section>
  </div>;
}
