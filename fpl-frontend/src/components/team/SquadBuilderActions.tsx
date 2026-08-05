import clsx from 'clsx';
import { Spinner } from '@/components/common/Spinner';
import { SQUAD_SIZE } from '@/lib/fplRules';

interface SquadBuilderActionsProps {
  canSubmit: boolean;
  isSubmitting: boolean;
  canAutoPick: boolean;
  isAutoPicking?: boolean;
  selectedCount: number;
  onAutoPick: () => void;
  onReset: () => void;
  onSubmit: () => void;
  hidePrimary?: boolean;
}

const outlinePillClass =
  'inline-flex min-h-[3.25rem] min-w-[8rem] flex-1 items-center justify-center gap-2 rounded-full border border-white/75 bg-transparent px-4 text-base font-extrabold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-fpl-cyan disabled:cursor-not-allowed disabled:opacity-40';

export function SquadBuilderActions({
  canSubmit,
  isSubmitting,
  canAutoPick,
  isAutoPicking = false,
  selectedCount,
  onAutoPick,
  onReset,
  onSubmit,
  hidePrimary = false,
}: SquadBuilderActionsProps) {
  const submitLabel =
    selectedCount < SQUAD_SIZE
      ? `Select 15 players (${selectedCount}/${SQUAD_SIZE})`
      : 'Enter Squad';

  return (
    <div className="grid w-full grid-cols-2 items-center gap-3 pt-2 sm:grid-cols-[1fr_auto_1.15fr]">
      {!hidePrimary ? <button
        type="button"
        onClick={onAutoPick}
        disabled={!canAutoPick || isSubmitting || isAutoPicking}
        className={outlinePillClass}
      >
        {isAutoPicking ? <Spinner size="sm" /> : null}
        Auto Pick
      </button> : null}
      <button
        type="button"
        onClick={onReset}
        disabled={isSubmitting || isAutoPicking}
        className="inline-flex min-h-[3.25rem] shrink-0 items-center justify-center rounded-full border border-white/75 bg-transparent px-6 text-base font-extrabold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-fpl-cyan disabled:cursor-not-allowed disabled:opacity-40"
      >
        Reset
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting || isAutoPicking}
        className={clsx(
          'col-span-2 inline-flex min-h-[3.25rem] min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 text-base font-extrabold transition focus:outline-none focus:ring-2 focus:ring-fpl-cyan disabled:cursor-not-allowed sm:col-span-1',
          canSubmit && !isSubmitting && !isAutoPicking
            ? 'bg-white text-[#37003c] hover:bg-fpl-gray-50'
            : 'bg-[#4c0054]/60 text-white/40',
        )}
      >
        {isSubmitting ? <Spinner size="sm" /> : null}
        {submitLabel}
      </button>
    </div>
  );
}
