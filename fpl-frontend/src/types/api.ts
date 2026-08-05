export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  priceBounds?: import('@/types/player').PriceBounds;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
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
    return error.error;
  }
  if (error instanceof Error) {
    if (error.message === 'Network Error') {
      return 'Network error. Check your connection and try again.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
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
