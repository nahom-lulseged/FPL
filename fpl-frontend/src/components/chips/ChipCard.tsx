import clsx from 'clsx';
import { Badge } from '@/components/common/Badge';

export type ChipCardState = 'available' | 'active' | 'used' | 'unavailable';

interface ChipCardProps {
  label: string;
  description: string;
  state: ChipCardState;
  accentClass: string;
  borderClass: string;
  bgClass: string;
  usedGameweek?: number;
  disabledReason?: string;
  onPlay?: () => void;
}

export function ChipCard({
  label,
  description,
  state,
  accentClass,
  borderClass,
  bgClass,
  usedGameweek,
  disabledReason,
  onPlay,
}: ChipCardProps) {
  const isClickable = state === 'available' && onPlay;

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={isClickable ? onPlay : undefined}
      title={disabledReason}
      className={clsx(
        'relative flex min-h-[100px] flex-col rounded-lg border p-3 text-left transition',
        borderClass,
        bgClass,
        state === 'available' &&
          'cursor-pointer hover:scale-[1.02] hover:border-white/30 hover:shadow-lg',
        state === 'active' && 'ring-2 ring-fpl-green/60',
        (state === 'used' || state === 'unavailable') && 'cursor-not-allowed opacity-50',
        !isClickable && state !== 'active' && 'cursor-not-allowed',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={clsx('text-sm font-bold', accentClass)}>{label}</p>
        {state === 'active' ? <Badge variant="success">Active</Badge> : null}
        {state === 'used' && usedGameweek ? (
          <Badge variant="default">GW {usedGameweek}</Badge>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-white/60">{description}</p>
      {disabledReason && state === 'unavailable' ? (
        <p className="mt-2 text-[10px] text-white/40">{disabledReason}</p>
      ) : null}
    </button>
  );
}
