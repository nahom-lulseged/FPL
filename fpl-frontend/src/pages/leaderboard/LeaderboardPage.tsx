import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Crown, Minus, TrendingDown, TrendingUp, Trophy, UsersRound } from 'lucide-react';
import { PremiumCard } from '@/components/common/PremiumCard';
import { getLeaderboard } from '@/api/experience.api';
import { formatMinor } from '@/lib/money';
import type { LeaderboardEntry } from '@/types/experience';

export function LeaderboardPage() {
  const [scope, setScope] = useState<'gameweek' | 'overall'>('gameweek');
  const query = useQuery({ queryKey: ['leaderboard', scope], queryFn: () => getLeaderboard(scope), retry: false });
  const entries = query.data?.data ?? [];

  return (
    <div className="page-stack leaderboard-page">
      <header className="page-intro"><div><p className="eyebrow">GLOBAL COMPETITION</p><h1>Leaderboard</h1><p>Track every move and see who is winning this gameweek.</p></div><span className="data-status"><UsersRound size={14} /> Live ranks</span></header>
      <div className="segmented-control"><button className={scope === 'gameweek' ? 'is-active' : ''} onClick={() => setScope('gameweek')}>Gameweek</button><button className={scope === 'overall' ? 'is-active' : ''} onClick={() => setScope('overall')}>Overall</button></div>
      {entries.length >= 3 ? <div className="leader-podium">{[entries[1]!, entries[0]!, entries[2]!].map((entry, index) => <Podium key={entry.userId} entry={entry} place={index === 1 ? 1 : index === 0 ? 2 : 3} />)}</div> : null}
      <PremiumCard className="leaderboard-list">
        {entries.map((entry) => <LeaderboardRow key={entry.userId} entry={entry} />)}
        {!query.isLoading && !entries.length ? <div className="leaderboard-empty"><Trophy size={30} /><h2>Standings are being prepared</h2><p>Ranks appear once team scores have been calculated for the active gameweek.</p></div> : null}
      </PremiumCard>
      {query.data?.currentUser && !entries.some((entry) => entry.isCurrentUser) ? <div className="current-rank-dock"><small>YOUR POSITION</small><LeaderboardRow entry={query.data.currentUser} /></div> : null}
    </div>
  );
}

function Podium({ entry, place }: { entry: LeaderboardEntry; place: number }) {
  return <PremiumCard className={`podium-card podium-card--${place}`}>{place === 1 ? <Crown size={20} /> : <span className="podium-place">{place}</span>}<span className="leader-avatar">{entry.username.slice(0, 1).toUpperCase()}</span><strong>{entry.username}</strong><small>{entry.points} pts</small>{entry.prizeMinor > 0 ? <b>{formatMinor(entry.prizeMinor)}</b> : null}</PremiumCard>;
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const movement = entry.previousRank ? entry.previousRank - entry.rank : 0;
  return <div className={`leaderboard-row ${entry.isCurrentUser ? 'is-current' : ''}`}><strong className="leaderboard-rank">{entry.rank}</strong><span className="leader-avatar">{entry.username.slice(0, 1).toUpperCase()}</span><div><strong>{entry.username}{entry.isCurrentUser ? ' · You' : ''}</strong><small>{entry.teamName}</small></div><b>{entry.points}<small>PTS</small></b><span className={movement > 0 ? 'movement-up' : movement < 0 ? 'movement-down' : ''}>{movement > 0 ? <TrendingUp size={14} /> : movement < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}{Math.abs(movement) || ''}</span></div>;
}
