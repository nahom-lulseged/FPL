import clsx from 'clsx';
import { TeamLogo } from '@/components/common/TeamLogo';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-fpl-green border-t-transparent',
        sizeClasses[size],
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="fpl-branded-loader" role="status" aria-live="polite" aria-label="Loading Fantasy Ethiopia">
      <span className="fpl-branded-loader__mark">
        <TeamLogo decorative eager className="fpl-branded-loader__logo" />
      </span>
      <strong className="fpl-branded-loader__text">Fantasy Ethiopia</strong>
    </div>
  );
}
