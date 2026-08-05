import clsx from 'clsx';
import { ClubCrest } from '@/components/pitch/ClubCrest';
import {
  POSITION_FILTER_LABEL,
  type RealTeamOption,
  type TeamFilterValue,
} from '@/lib/playerScopeFilter';
import type { Position } from '@/types/player';

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

interface PlayerScopeFilterMenuProps {
  value: TeamFilterValue;
  teams: RealTeamOption[];
  onChange: (value: TeamFilterValue) => void;
}

function ScopeChip({
  label,
  selected,
  disabled,
  onSelect,
  className,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onSelect}
      className={clsx(
        'rounded-md px-2.5 py-2 text-left text-sm text-white transition',
        disabled && 'cursor-not-allowed opacity-45',
        !disabled && selected && 'bg-[#5b2b8a]',
        !disabled && !selected && 'hover:bg-white/10',
        className,
      )}
    >
      {label}
    </button>
  );
}

export function PlayerScopeFilterMenu({ value, teams, onChange }: PlayerScopeFilterMenuProps) {
  return (
    <div className="p-4">
      <section>
        <h3 className="mb-2 text-sm font-bold text-white">Global</h3>
        <div className="flex flex-wrap gap-1">
          <ScopeChip
            label="All players"
            selected={value === 'all'}
            onSelect={() => onChange('all')}
          />
          <ScopeChip
            label="Watchlist"
            selected={value === 'watchlist'}
            onSelect={() => onChange('watchlist')}
          />
        </div>
      </section>

      <hr className="my-3 border-white/20" />

      <section>
        <h3 className="mb-2 text-sm font-bold text-white">Position</h3>
        <div className="grid grid-cols-4 gap-1">
          {POSITIONS.map((pos) => (
            <ScopeChip
              key={pos}
              label={POSITION_FILTER_LABEL[pos]}
              selected={value === `pos-${pos}`}
              onSelect={() => onChange(`pos-${pos}`)}
              className="min-w-0 px-1 text-center text-xs sm:px-2 sm:text-sm sm:text-left"
            />
          ))}
        </div>
      </section>

      <hr className="my-3 border-white/20" />

      <section>
        <h3 className="mb-2 text-sm font-bold text-white">Teams</h3>
        <div className="grid grid-cols-4 gap-x-2 gap-y-1">
          {teams.map((team) => {
            const optionValue = `club-${team.id}` as const;
            const selected = value === optionValue;
            return (
              <button
                key={team.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(optionValue)}
                className={clsx(
                  'flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-xs text-white transition sm:text-sm',
                  selected ? 'bg-[#5b2b8a]' : 'hover:bg-white/10',
                )}
              >
                <ClubCrest shortName={team.shortName} />
                <span className="min-w-0 truncate">{team.name}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
