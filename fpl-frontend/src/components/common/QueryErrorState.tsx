import { Button } from '@/components/common/Button';
import { getErrorMessage } from '@/types/api';

interface QueryErrorStateProps {
  error: unknown;
  message?: string;
  onRetry?: () => void;
}

export function QueryErrorState({ error, message, onRetry }: QueryErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-fpl-pink/30 bg-fpl-pink/10 px-6 py-10 text-center">
      <p className="text-sm text-fpl-pink">{getErrorMessage(error, message ?? 'Failed to load data')}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
