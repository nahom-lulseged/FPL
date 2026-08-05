import clsx from 'clsx';
import { useToastStore } from '@/store/toastStore';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'pointer-events-auto rounded-md border px-4 py-3 text-sm font-medium shadow-lg',
            toast.type === 'success' && 'border-fpl-green bg-fpl-green/10 text-fpl-gray-900',
            toast.type === 'error' && 'border-fpl-pink bg-fpl-pink/10 text-fpl-pink',
            toast.type === 'info' && 'border-fpl-cyan bg-fpl-cyan/10 text-fpl-gray-900',
          )}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <span>{toast.message}</span>
            <button
              type="button"
              className="text-xs opacity-70 hover:opacity-100"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
