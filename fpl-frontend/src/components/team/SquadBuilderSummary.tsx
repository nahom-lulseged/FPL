import { formatPrice } from '@/lib/formatters';
import { getRemainingBudget, SQUAD_SIZE } from '@/lib/fplRules';
import type { PlayerListItem } from '@/types/player';

interface SquadBuilderSummaryProps {
  selectedPlayers: PlayerListItem[];
  layout?: 'grid' | 'inline' | 'header';
}

function formatBankDisplay(remainingTenths: number): string {
  if (remainingTenths < 0) {
    return `-${formatPrice(Math.abs(remainingTenths))}`;
  }
  return formatPrice(remainingTenths);
}

function HeaderStat({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: 'players' | 'bank';
}) {
  return (
    <div className="text-center">
      <div
        className={
          variant === 'players'
            ? 'min-w-[6rem] rounded-lg bg-[#E90052] px-3 py-2.5 text-2xl font-black leading-none text-white sm:min-w-[6.6rem]'
            : 'min-w-[6rem] rounded-lg bg-[#00FF87] px-3 py-2.5 text-2xl font-black leading-none text-[#37003c] sm:min-w-[6.6rem]'
        }
      >
        {value}
      </div>
      <p className="mt-2 text-base text-[#d5c0df]">{label}</p>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: 'players' | 'bank';
}) {
  return (
    <div
      className={
        variant === 'players'
          ? 'min-w-[7rem] rounded-lg bg-[#E90052] px-3 py-2 text-center text-white'
          : 'min-w-[7rem] rounded-lg bg-[#00FF87] px-3 py-2 text-center text-[#37003c]'
      }
    >
      <div className="text-lg font-extrabold leading-none tracking-tight">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-wide">
        {label}
      </div>
    </div>
  );
}

export function SquadBuilderSummary({
  selectedPlayers,
  layout = 'grid',
}: SquadBuilderSummaryProps) {
  const remainingBudget = getRemainingBudget(selectedPlayers);
  const playersValue = `${selectedPlayers.length} / ${SQUAD_SIZE}`;
  const bankValue = formatBankDisplay(remainingBudget);

  if (layout === 'header') {
    return (
      <div className="flex shrink-0 justify-start gap-5 sm:justify-end sm:gap-8">
        <HeaderStat label="Players selected" value={playersValue} variant="players" />
        <div className="mt-0.5 hidden h-20 w-px bg-white/20 sm:block" aria-hidden />
        <HeaderStat label="Bank" value={bankValue} variant="bank" />
      </div>
    );
  }

  return (
    <div className={layout === 'inline' ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 gap-2'}>
      <SummaryChip label="Players selected" value={playersValue} variant="players" />
      <SummaryChip label="Bank" value={bankValue} variant="bank" />
    </div>
  );
}
