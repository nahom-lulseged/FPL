import { Input } from '@/components/common/Input';

interface StakeAmountInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function StakeAmountInput({ value, onChange, error, disabled }: StakeAmountInputProps) {
  return (
    <div className="space-y-1">
      <Input
        label="Stake amount (ETB)"
        name="stakeAmount"
        type="number"
        min={1}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. 100"
        error={error}
        disabled={disabled}
      />
      <p className="text-xs text-white/50">
        Platform max stake: ETB {(FINANCE_MAX_STAKE_MINOR / 100).toLocaleString()}
      </p>
    </div>
  );
}

const FINANCE_MAX_STAKE_MINOR = 10_000_00;
