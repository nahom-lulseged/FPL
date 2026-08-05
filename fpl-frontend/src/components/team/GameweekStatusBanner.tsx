import clsx from 'clsx';
import { formatDeadlineCountdown, formatGameweekStatus } from '@/lib/formatters';
import { useSocket } from '@/hooks/useSocket';
import type { Gameweek } from '@/types/gameweek';

interface GameweekStatusBannerProps {
  gameweek: Gameweek | null;
  isHistoricalView?: boolean;
  currentGameweekNumber?: number | null;
  className?: string;
}

export function GameweekStatusBanner({
  gameweek,
  isHistoricalView,
  currentGameweekNumber,
  className,
}: GameweekStatusBannerProps) {
  const { isConnected } = useSocket();
  const isLiveConnected = gameweek?.status === 'LIVE' && isConnected;
  if (!gameweek) {
    return null;
  }

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-fpl-purple/40 px-4 py-2',
        className,
      )}
    >
      <span
        className={clsx(
          'rounded-full px-2 py-0.5 text-xs font-semibold uppercase',
          gameweek.status === 'LIVE' && 'bg-fpl-green/20 text-fpl-green',
          gameweek.status === 'UPCOMING' && 'bg-fpl-gray-500/20 text-fpl-gray-500',
          gameweek.status === 'FINISHED' && 'bg-white/10 text-white/60',
        )}
      >
        GW {gameweek.number} · {formatGameweekStatus(gameweek.status)}
      </span>

      {gameweek.status === 'UPCOMING' ? (
        <span className="text-sm text-white/70">
          Deadline in {formatDeadlineCountdown(gameweek.deadline)}
        </span>
      ) : null}

      {gameweek.status === 'LIVE' ? (
        <span className="flex items-center gap-1.5 text-sm text-fpl-green">
          {isLiveConnected ? (
            <span
              className="inline-block h-2 w-2 animate-pulse rounded-full bg-fpl-green"
              aria-hidden
            />
          ) : null}
          Scores are provisional
          {isLiveConnected ? ' · Live updates on' : ''}
        </span>
      ) : null}

      {gameweek.status === 'LIVE' ? (
        <span className="w-full text-xs text-white/40">* = provisional points</span>
      ) : null}

      {isHistoricalView && currentGameweekNumber !== gameweek.number ? (
        <span className="text-sm text-white/50">
          Viewing historical gameweek (current: GW {currentGameweekNumber})
        </span>
      ) : null}
    </div>
  );
}
