import { ChevronRight, Clock3, Trophy, UsersRound, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/common/Badge';
import { formatMinor } from '@/lib/money';
import type { LeagueSummary } from '@/types/league';

interface LeagueCardProps {
  league: LeagueSummary;
  onSelect?: (league: LeagueSummary) => void;
}

function LeagueCardBody({ league }: { league: LeagueSummary }) {
  const isStaked = league.isStaked || (league.stakeAmountMinor != null && league.stakeAmountMinor > 0);
  return <div className="league-card-redesign__body">
    <div className="league-card-redesign__icon"><Trophy size={21} /></div>
    <div className="league-card-redesign__copy">
      <div className="league-card-redesign__badges">{isStaked ? <Badge variant="warning">Weekly prize</Badge> : <Badge variant="position">Private classic</Badge>}{league.isAdmin ? <Badge variant="warning">Admin</Badge> : null}</div>
      <h3>{league.name}</h3>
      <p><UsersRound size={13} /> {league.memberCount} {league.memberCount === 1 ? 'manager' : 'managers'} <span>·</span> {league.season}</p>
      {isStaked ? <div className="league-card-redesign__money"><span><WalletCards size={13} /> Entry <strong>{formatMinor(league.stakeAmountMinor!)}</strong></span><span>Prize <strong>{formatMinor(league.potTotalMinor ?? 0)}</strong></span></div> : null}
    </div>
    <ChevronRight size={17} />
    <div className="league-card-redesign__progress"><span style={{ width: `${Math.min(100, Math.max(12, league.memberCount))}%` }} /></div>
    <div className="league-card-redesign__footer"><span><Clock3 size={12} /> Gameweek contest</span>{league.joinedAt ? <span>Joined {new Date(league.joinedAt).toLocaleDateString()}</span> : <span>Spots available</span>}</div>
  </div>;
}

export function LeagueCard({ league, onSelect }: LeagueCardProps) {
  if (onSelect) return <button type="button" onClick={() => onSelect(league)} className="league-card-redesign"><LeagueCardBody league={league} /></button>;
  return <Link to={`/leagues/${league.id}`} className="league-card-redesign"><LeagueCardBody league={league} /></Link>;
}
