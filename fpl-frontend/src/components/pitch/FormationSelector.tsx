import {
  formationLabel,
  VALID_FORMATIONS,
  type Formation,
} from '@/lib/fplRules';

interface FormationSelectorProps {
  value: Formation;
  onChange: (formation: Formation) => void;
  disabled?: boolean;
}

export function FormationSelector({ value, onChange, disabled }: FormationSelectorProps) {
  const currentLabel = formationLabel(value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="formation-select" className="text-sm font-medium text-white/70">
        Formation
      </label>
      <select
        id="formation-select"
        disabled={disabled}
        value={currentLabel}
        onChange={(event) => {
          const selected = VALID_FORMATIONS.find(
            (f) => formationLabel(f) === event.target.value,
          );
          if (selected) {
            onChange(selected);
          }
        }}
        className="rounded-md border border-white/20 bg-fpl-dark px-3 py-1.5 text-sm text-white focus:border-fpl-green focus:outline-none disabled:opacity-50"
      >
        {VALID_FORMATIONS.map((formation) => (
          <option key={formationLabel(formation)} value={formationLabel(formation)}>
            {formationLabel(formation)}
          </option>
        ))}
      </select>
    </div>
  );
}
