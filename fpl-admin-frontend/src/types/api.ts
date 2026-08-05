export interface ApiError {
  error: string;
  unlockAt?: string;
  details?: Record<string, string[]>;
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as ApiError).error === 'string'
  );
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (isApiError(error)) {
    if (error.unlockAt) {
      return `${error.error} Try again after ${new Date(error.unlockAt).toLocaleString()}.`;
    }
    return error.error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error) || !error.details) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(error.details).map(([field, messages]) => [field, messages[0] ?? 'Invalid']),
  );
}
