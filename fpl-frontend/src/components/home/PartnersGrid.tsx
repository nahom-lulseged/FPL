import clsx from 'clsx';
import { PARTNERS } from '@/data/homeContent';

interface PartnersGridProps {
  className?: string;
  compact?: boolean;
}

export function PartnersGrid({ className, compact = false }: PartnersGridProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl bg-fpl-purple-700/50 p-4 ring-1 ring-white/10 sm:p-6',
        className,
      )}
    >
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6 md:gap-6">
        {PARTNERS.map((partner) => (
          <li key={partner.id} className="flex flex-col items-center gap-2 text-center">
            <div
              className={clsx(
                'flex items-center justify-center rounded-lg bg-white/5 font-bold tracking-tight text-white',
                compact ? 'h-10 w-full text-xs sm:text-sm' : 'h-12 w-full text-sm sm:h-14 sm:text-base',
              )}
            >
              {partner.name}
            </div>
            <span className="text-[10px] leading-tight text-white/50 sm:text-xs">{partner.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
