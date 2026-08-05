import { useMemo, useState } from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { JoinLeagueForm } from '@/components/league/JoinLeagueForm';
import { LeagueCard } from '@/components/league/LeagueCard';
import { JoinStakeConfirmDialog } from '@/components/leagues/JoinStakeConfirmDialog';
import { useJoinStakedLeague } from '@/hooks/useJoinStakedLeague';
import { useMyLeagues } from '@/hooks/useMyLeagues';
import { useStakedLeagues } from '@/hooks/useStakedLeagues';
import { useWallet } from '@/hooks/useWallet';
import type { LeagueSummary } from '@/types/league';

export function JoinLeaguePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'private' | 'public'>('private');
  const [pending, setPending] = useState<LeagueSummary | null>(null);
  const publicLeagues = useStakedLeagues(1, 20);
  const mine = useMyLeagues();
  const wallet = useWallet();
  const join = useJoinStakedLeague();
  const joined = useMemo(() => new Set((mine.data?.data ?? []).map((league) => league.id)), [mine.data?.data]);

  async function confirm() {
    if (!pending) return;
    const result = await join.mutateAsync(pending.id);
    setPending(null); navigate(`/leagues/${result.id}`);
  }

  return <div className="fpl-flow-screen">
    <header className="fpl-screen-heading"><button type="button" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft /></button><h1>Leagues</h1><span /></header>
    <main className="fpl-join-card">
      <h2>Join a League</h2>
      <div className="fpl-panel-tabs fpl-panel-tabs--large"><button className={mode === 'private' ? 'is-active' : ''} onClick={() => setMode('private')}>Private</button><button className={mode === 'public' ? 'is-active' : ''} onClick={() => setMode('public')}>Public</button></div>
      {mode === 'private' ? <section className="fpl-join-private"><h3>Enter the private league code provided by the league admin.</h3><p>Private leagues are free and available by invitation.</p><JoinLeagueForm onSuccess={(id) => navigate(`/leagues/${id}`)} /></section> : <section className="fpl-public-leagues"><div><h3>Weekly Prize Leagues</h3><p>Join verified platform contests using your ETB wallet balance.</p></div>{!publicLeagues.isLoading && !publicLeagues.data?.data.length ? <div className="fpl-cups-empty"><Trophy size={38} /><p>No public contests are open right now.</p></div> : null}<div className="league-card-list">{(publicLeagues.data?.data ?? []).map((league) => <LeagueCard key={league.id} league={league} onSelect={joined.has(league.id) ? undefined : setPending} />)}</div></section>}
    </main>
    {pending ? <JoinStakeConfirmDialog open onClose={() => setPending(null)} onConfirm={() => void confirm()} stakeAmountMinor={pending.stakeAmountMinor ?? 0} walletBalanceMinor={wallet.data?.balanceMinor ?? 0} leagueName={pending.name} isLoading={join.isPending} /> : null}
  </div>;
}
