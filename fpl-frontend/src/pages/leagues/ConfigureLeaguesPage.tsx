import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function ConfigureLeaguesPage() {
  const navigate = useNavigate();
  return <div className="fpl-flow-screen">
    <header className="fpl-screen-heading"><button type="button" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft /></button><h1>Configure leagues</h1><span /></header>
    <main className="fpl-configure-card"><h2>Choose a League Type to Create</h2><section><h3>Classic Scoring</h3><p>Teams are ranked using total fantasy points. Managers can join or leave throughout the season.</p><Link to="/leagues/create">Create a League &amp; Cup</Link></section><div className="fpl-or"><span />or<span /></div><section><h3>Weekly Prize League</h3><p>Paid contests are created by the platform. Browse published gameweek pools, entry fees and payout structures.</p><Link to="/leagues/join">Browse Public Leagues</Link></section><div className="fpl-or"><span />or<span /></div><section><h3>Join an Invitational League</h3><p>Enter a private code shared by another league manager.</p><Link to="/leagues/join">Join Invitational League &amp; Cup</Link></section></main>
  </div>;
}
