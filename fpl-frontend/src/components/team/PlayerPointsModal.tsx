import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/common/Badge';
import type { PlayerEventStats, PointsStatus, SquadEntry, TeamGameweekPlayer } from '@/types/team';

type PlayerDetail = SquadEntry | TeamGameweekPlayer;

interface PlayerPointsModalProps {
  open: boolean;
  onClose: () => void;
  player: PlayerDetail | null;
  pointsStatus?: PointsStatus;
}

function StatCell({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">{label}</p>
      <p className={accent ? 'text-lg font-bold text-fpl-green' : 'text-lg font-bold text-white'}>
        {value}
      </p>
    </div>
  );
}

function isSquadEntry(player: PlayerDetail): player is SquadEntry {
  return 'player' in player;
}

export function PlayerPointsModal({
  open,
  onClose,
  player,
  pointsStatus,
}: PlayerPointsModalProps) {
  if (!player) {
    return null;
  }

  const name = isSquadEntry(player) ? player.player.name : player.name;
  const position = player.position;
  const club = isSquadEntry(player) ? player.player.realTeam.shortName : undefined;
  const eventStats: PlayerEventStats | null | undefined = isSquadEntry(player)
    ? null
    : player.eventStats;

  const rawPoints = player.rawPoints;
  const effectivePoints = isSquadEntry(player) ? player.gameweekPoints : player.effectivePoints;

  return (
    <Modal open={open} onClose={onClose} title={name} className="max-w-lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="position">{position}</Badge>
          {club ? <span className="text-sm text-white/60">{club}</span> : null}
          {player.isCaptain ? (
            <Badge variant="success">
              {player.captainMultiplier === 3 ? 'Triple Captain (3×)' : 'Captain'}
            </Badge>
          ) : null}
          {player.isViceCaptain ? <Badge variant="default">Vice</Badge> : null}
          {pointsStatus === 'provisional' ? (
            <Badge variant="default">Provisional</Badge>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCell label="Raw points" value={rawPoints ?? '—'} accent />
          <StatCell label="Effective points" value={effectivePoints ?? '—'} accent />
          <StatCell
            label="Captain multiplier"
            value={player.captainMultiplier ?? (player.isCaptain ? 2 : 1)}
          />
          <StatCell
            label="Counted"
            value={
              player.counted === null ? '—' : player.counted ? 'Yes' : 'No'
            }
          />
        </div>

        {player.wasSubstitutedIn ? (
          <p className="text-sm text-fpl-green">Auto-substituted into starting XI</p>
        ) : null}
        {player.wasSubstitutedOut ? (
          <p className="text-sm text-fpl-pink">Auto-substituted out of starting XI</p>
        ) : null}

        {eventStats ? (
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Event stats</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <StatCell label="Minutes" value={eventStats.minutes} />
              <StatCell label="Goals" value={eventStats.goals} accent />
              <StatCell label="Assists" value={eventStats.assists} accent />
              <StatCell label="Clean sheet" value={eventStats.cleanSheet ? 'Yes' : 'No'} />
              <StatCell label="BPS" value={eventStats.bps} accent />
              {eventStats.bonus > 0 ? (
                <StatCell label="Bonus" value={eventStats.bonus} />
              ) : eventStats.provisionalBonus && eventStats.provisionalBonus > 0 ? (
                <StatCell
                  label="Prov. bonus"
                  value={`${eventStats.provisionalBonus}*`}
                />
              ) : (
                <StatCell label="Bonus" value={eventStats.bonus} />
              )}
              <StatCell label="Yellow" value={eventStats.yellowCards} />
              <StatCell label="Red" value={eventStats.redCards} />
              <StatCell label="Points" value={eventStats.points} />
            </div>
            {eventStats.bonus === 0 &&
            eventStats.provisionalBonus &&
            eventStats.provisionalBonus > 0 &&
            pointsStatus === 'provisional' ? (
              <p className="mt-2 text-xs text-white/50">
                * Provisional bonus estimated from BPS during live matches
              </p>
            ) : null}
          </div>
        ) : pointsStatus === 'pending' ? (
          <p className="text-sm text-white/50">Points pending — gameweek has not started.</p>
        ) : null}
      </div>
    </Modal>
  );
}
