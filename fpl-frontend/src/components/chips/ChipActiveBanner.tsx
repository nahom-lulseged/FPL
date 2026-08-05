import clsx from 'clsx';
import { CHIP_META, formatChipLabel, getChipBannerMessage } from '@/lib/chipMeta';
import type { ChipType } from '@/types/chip';

interface ChipActiveBannerProps {
  activeChip: ChipType;
  gameweekNumber?: number;
  className?: string;
}

export function ChipActiveBanner({ activeChip, gameweekNumber, className }: ChipActiveBannerProps) {
  const meta = CHIP_META[activeChip];

  return (
    <div
      className={clsx(
        'rounded-lg border px-4 py-3',
        meta.borderClass,
        meta.bgClass,
        className,
      )}
    >
      <p className={clsx('text-sm font-semibold', meta.accentClass)}>
        {formatChipLabel(activeChip)}
        {gameweekNumber ? ` · GW ${gameweekNumber}` : ''}
      </p>
      <p className="mt-0.5 text-sm text-white/70">{getChipBannerMessage(activeChip)}</p>
    </div>
  );
}
