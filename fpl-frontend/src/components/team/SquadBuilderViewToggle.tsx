import clsx from 'clsx';

export type SquadBuilderViewMode = 'pitch' | 'list';

interface SquadBuilderViewToggleProps {
  value: SquadBuilderViewMode;
  onChange: (value: SquadBuilderViewMode) => void;
}

export function SquadBuilderViewToggle({ value, onChange }: SquadBuilderViewToggleProps) {
  return (
    <div
      className="grid w-full max-w-[17rem] grid-cols-2 rounded-lg bg-[#51005c] p-1"
      role="group"
      aria-label="Squad view"
    >
      {(['pitch', 'list'] as SquadBuilderViewMode[]).map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            aria-label={mode === 'pitch' ? 'Pitch View' : 'List View'}
            aria-pressed={active}
            className={clsx(
              'min-h-10 rounded-md px-4 py-2 text-base font-bold transition',
              active
                ? 'bg-[#2d0035] text-white shadow-sm'
                : 'bg-transparent text-white/70 hover:bg-white/5 hover:text-white',
            )}
          >
            {mode === 'pitch' ? 'Pitch' : 'List'}
          </button>
        );
      })}
    </div>
  );
}
