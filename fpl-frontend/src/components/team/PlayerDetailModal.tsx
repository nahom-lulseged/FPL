import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/common/Modal';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { TeamLogo } from '@/components/common/TeamLogo';
import { ClubBadge } from '@/components/pitch/ClubBadge';
import { ShirtVisual } from '@/components/pitch/PlayerCard';
import { usePlayer } from '@/hooks/usePlayer';
import { usePositionPlayerRanks } from '@/hooks/usePositionPlayerRanks';
import { formatPrice } from '@/lib/formatters';
import type { CSSProperties, ReactNode } from 'react';

interface PlayerTeamActions {
  canEdit: boolean;
  isStarter: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
  onCaptain: () => void;
  onViceCaptain: () => void;
  onSubstitute: () => void;
}

interface PlayerDetailModalProps {
  playerId: string | null;
  onClose: () => void;
  actions?: ReactNode;
  teamActions?: PlayerTeamActions;
  title?: string;
  workflowTitle?: string;
}

const POSITION_NAMES = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Forward',
} as const;

function fdrClass(fdr: number | null) {
  if (fdr === null) return 'is-neutral';
  if (fdr <= 2) return 'is-easy';
  if (fdr >= 4) return 'is-hard';
  return 'is-neutral';
}

export function PlayerDetailModal({
  playerId,
  onClose,
  actions,
  teamActions,
  title,
  workflowTitle = 'Pick Team',
}: PlayerDetailModalProps) {
  const { data: player, isLoading, isError, error, refetch } = usePlayer(playerId ?? undefined);
  const { data: ranks } = usePositionPlayerRanks(player?.position, player?.id);
  const rankLabel = (rank: number | undefined) =>
    ranks && rank && rank > 0 ? `${rank} of ${ranks.total}` : 'Rank pending';

  return (
    <Modal
      open={Boolean(playerId)}
      onClose={onClose}
      title={title ?? player?.name ?? 'Player details'}
      placement="bottom"
      hideTitle
      className="reference-player-sheet"
      closeOnBackdrop
      swipeToDismiss
    >
      <button type="button" className="reference-sheet-focus-target" aria-label="Player details opened" />
      <header className="reference-player-sheet-header">
        <button type="button" onClick={onClose} aria-label="Back to Pick Team">
          <ArrowLeft aria-hidden="true" />
        </button>
        <h2>{workflowTitle}</h2>
        <TeamLogo decorative eager />
      </header>
      <div className="reference-player-sheet-handle" data-swipe-handle aria-hidden="true" />
      {isLoading ? (
        <div className="reference-player-sheet-loading" aria-label="Loading player details">
          <div />
          <div />
          <div />
        </div>
      ) : null}

      {isError ? (
        <QueryErrorState error={error} message="Failed to load player details" onRetry={() => void refetch()} />
      ) : null}

      {player && !isLoading && !isError ? (
        <div className="reference-player-profile">
          <section className="reference-player-hero">
            <div className="reference-player-photo" aria-hidden="true">
              <div className="reference-player-shirt">
                <ShirtVisual shortName={player.realTeam.shortName} position={player.position} clubId={player.realTeam.id} />
              </div>
            </div>
            <div className="reference-player-identity">
              <small>{POSITION_NAMES[player.position]}</small>
              <span>{player.name.split(' ').slice(0, -1).join(' ')}</span>
              <strong>{player.name.split(' ').at(-1)}</strong>
              <p>{player.realTeam.name}</p>
            </div>
          </section>

          <div className="reference-player-links">
            <Link to={`/players/${player.id}`}>Player Profile <ExternalLink /></Link>
            <button type="button" disabled title="Merchandise partner coming soon">Buy Player Shirt <ExternalLink /></button>
          </div>

          <section className="reference-player-rankings" aria-label="Player statistics">
            <div><small>Price</small><strong>{formatPrice(player.price)}</strong><span>{rankLabel(ranks?.price)}</span></div>
            <div><small>Pnts/Match</small><strong>{(player.totalPoints / Math.max(1, Math.ceil(player.minutes / 90))).toFixed(1)}</strong><span>{rankLabel(ranks?.pointsPerMatch)}</span></div>
            <div><small>Form</small><strong>{player.eventPoints.toFixed(1)}</strong><span>{rankLabel(ranks?.form)}</span></div>
            <div><small>Selected</small><strong>{player.selectedByPercent.toFixed(1)}%</strong><span>{rankLabel(ranks?.selected)}</span></div>
            <p>Season overview for {POSITION_NAMES[player.position]}s</p>
          </section>

          <section className="reference-player-performance">
            <div className="reference-player-form">
              <h3>Form</h3>
              <div className="reference-form-bars" aria-label="Recent fantasy points">
                {(player.history ?? []).slice(-3).map((row) => (
                  <span key={row.gameweek} style={{ '--form-value': `${Math.min(100, Math.max(12, row.points * 10))}%` } as CSSProperties}>
                    <i />
                    <small>GW{row.gameweek}</small>
                  </span>
                ))}
                {(player.history?.length ?? 0) === 0 ? <p>No recent data</p> : null}
              </div>
            </div>
            <div className="reference-player-fixtures">
              <h3>Fixtures</h3>
              <div>
                {player.upcomingFixtures.slice(0, 3).map((fixture) => (
                  <article key={fixture.id}>
                    <small>GW{fixture.gameweek.number}</small>
                    <ClubBadge shortName={fixture.opponent.shortName} playerName={fixture.opponent.name} size="sm" />
                    <span>{fixture.opponent.shortName} ({fixture.isHome ? 'H' : 'A'})</span>
                    <strong className={fdrClass(fixture.fdr)}>{fixture.fdr ?? '-'}</strong>
                  </article>
                ))}
                {player.upcomingFixtures.length === 0 ? <p>No upcoming fixtures</p> : null}
              </div>
            </div>
          </section>

          {teamActions?.canEdit ? (
            <>
              <div className="reference-captain-controls">
                <button
                  type="button"
                  className={teamActions.isCaptain ? 'is-checked' : undefined}
                  disabled={!teamActions.isStarter}
                  onClick={teamActions.onCaptain}
                  aria-pressed={teamActions.isCaptain}
                ><i aria-hidden="true" /> Captain</button>
                <button
                  type="button"
                  className={teamActions.isViceCaptain ? 'is-checked' : undefined}
                  disabled={!teamActions.isStarter}
                  onClick={teamActions.onViceCaptain}
                  aria-pressed={teamActions.isViceCaptain}
                ><i aria-hidden="true" /> Vice captain</button>
              </div>
              <div className="reference-player-actions">
                <Link to={`/players/${player.id}`}>Full Profile</Link>
                <button type="button" onClick={teamActions.onSubstitute}>Substitute</button>
              </div>
            </>
          ) : actions ? <div className="player-detail-actions">{actions}</div> : null}
        </div>
      ) : null}
    </Modal>
  );
}
