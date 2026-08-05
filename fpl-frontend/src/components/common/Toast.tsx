import clsx from 'clsx';
import { useToastStore } from '@/store/toastStore';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'pointer-events-auto rounded-md border px-4 py-3 text-sm font-medium shadow-lg',
            toast.type === 'success' && 'border-fpl-green/50 bg-fpl-purple text-fpl-green',
            toast.type === 'error' && 'border-fpl-pink/50 bg-fpl-purple text-fpl-pink',
            toast.type === 'info' && 'border-fpl-cyan/50 bg-fpl-purple text-white',
          )}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <span>{toast.message}</span>
            <button
              type="button"
              className="text-xs text-white/60 hover:text-white"
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
