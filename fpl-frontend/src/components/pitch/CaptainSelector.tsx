import clsx from 'clsx';

interface CaptainSelectorProps {
  disabled?: boolean;
}

export function CaptainSelector({ disabled }: CaptainSelectorProps) {
  return (
    <p className={clsx('text-sm', disabled ? 'text-white/70' : 'text-white/80')}>
      {disabled
        ? 'Complete your 15-man squad to set captain and vice-captain.'
        : 'Select a starting player on the pitch (click or press Enter) to set captain (C) and vice-captain (V).'}
    </p>
  );
}
