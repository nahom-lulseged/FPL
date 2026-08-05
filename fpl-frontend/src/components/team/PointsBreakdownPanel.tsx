import clsx from 'clsx';
import type { ChipType } from '@/types/chip';
import type { GameweekBreakdown } from '@/types/team';

interface PointsBreakdownPanelProps {
  breakdown: GameweekBreakdown | null;
  total: number | null;
  activeChip?: ChipType | null;
  className?: string;
}

function BreakdownItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | null;
  highlight?: 'negative';
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-fpl-purple/40 px-3 py-2 text-center">
      <p className="text-xs text-white/50">{label}</p>
      <p
        className={clsx(
          'text-lg font-semibold',
          highlight === 'negative' && value && value > 0 ? 'text-fpl-pink' : 'text-white',
        )}
      >
        {value === null ? '—' : highlight === 'negative' && value > 0 ? `−${value}` : value}
      </p>
    </div>
  );
}

export function PointsBreakdownPanel({
  breakdown,
  total,
  activeChip,
  className,
}: PointsBreakdownPanelProps) {
  const benchLabel =
    activeChip === 'BENCH_BOOST' && breakdown?.benchPoints && breakdown.benchPoints > 0
      ? 'Bench boost'
      : 'Bench';

  const hasBreakdown =
    breakdown !== null &&
    (breakdown.startersPoints !== null ||
      breakdown.captainBonus !== null ||
      breakdown.benchPoints !== null ||
      breakdown.transferHit !== null);
  const hasTotal = total !== null && total !== undefined;

  if (!hasBreakdown && !hasTotal) {
    return (
      <div
        className={clsx(
          'rounded-xl border border-white/10 bg-fpl-purple/20 px-4 py-3 text-center text-sm text-white/55',
          className,
        )}
      >
        No points yet this gameweek
      </div>
    );
  }

  return (
    <div className={clsx('grid grid-cols-2 gap-2 sm:grid-cols-5', className)}>
      <BreakdownItem label="Starters" value={breakdown?.startersPoints ?? null} />
      <BreakdownItem label="Captain bonus" value={breakdown?.captainBonus ?? null} />
      <BreakdownItem label={benchLabel} value={breakdown?.benchPoints ?? null} />
      <BreakdownItem
        label="Transfer hit"
        value={breakdown?.transferHit ?? null}
        highlight="negative"
      />
      <BreakdownItem label="Total" value={total} />
    </div>
  );
}
