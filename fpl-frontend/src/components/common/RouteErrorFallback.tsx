import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Button } from '@/components/common/Button';

export function RouteErrorFallback() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText || 'Page failed to load'
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred';

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-xl font-bold text-white">Something went wrong</h1>
      <p className="max-w-md text-sm text-white/70">{message}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="secondary" onClick={() => window.history.back()}>
          Go back
        </Button>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    </div>
  );
}
