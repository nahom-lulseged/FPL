import clsx from 'clsx';
import { formatPrice } from '@/lib/formatters';
import { BUDGET_TENTHS, SQUAD_SIZE } from '@/lib/fplRules';
import type { PlayerListItem } from '@/types/player';

interface BudgetTrackerProps {
  selectedPlayers: PlayerListItem[];
}

export function BudgetTracker({ selectedPlayers }: BudgetTrackerProps) {
  const spent = selectedPlayers.reduce((sum, p) => sum + p.price, 0);
  const remaining = BUDGET_TENTHS - spent;

  return (
    <div className="rounded-lg border border-white/10 bg-fpl-purple/60 p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">Budget</p>
          <p className="text-2xl font-bold text-white">{formatPrice(BUDGET_TENTHS)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-white/50">Spent</p>
          <p className="text-lg font-semibold text-fpl-green">{formatPrice(spent)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-white/50">Remaining</p>
          <p
            className={clsx(
              'text-lg font-semibold',
              remaining < 0 ? 'text-fpl-pink' : 'text-white',
            )}
          >
            {formatPrice(Math.max(0, remaining))}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-white/50">Squad</p>
          <p className="text-lg font-semibold text-white">
            {selectedPlayers.length}/{SQUAD_SIZE}
          </p>
        </div>
      </div>
      <progress
        className={clsx(
          'budget-tracker-progress',
          remaining < 0 && 'budget-tracker-progress--over',
        )}
        value={spent}
        max={BUDGET_TENTHS}
        aria-label={`Budget spent: ${formatPrice(spent)} of ${formatPrice(BUDGET_TENTHS)}`}
      />
    </div>
  );
}
