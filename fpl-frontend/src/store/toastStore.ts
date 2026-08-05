import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export interface AddToastOptions {
  durationMs?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>, options?: AddToastOptions) => void;
  removeToast: (id: string) => void;
}

const DEFAULT_DISMISS_MS = 5000;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast(toast, options) {
    const id = crypto.randomUUID();
    const durationMs = options?.durationMs ?? DEFAULT_DISMISS_MS;
    set({ toasts: [...get().toasts, { ...toast, id }] });
    window.setTimeout(() => {
      get().removeToast(id);
    }, durationMs);
  },

  removeToast(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export function useToast() {
  const addToast = useToastStore((state) => state.addToast);

  return {
    success: (message: string, options?: AddToastOptions) =>
      addToast({ type: 'success', message }, options),
    error: (message: string, options?: AddToastOptions) =>
      addToast({ type: 'error', message }, options),
    info: (message: string, options?: AddToastOptions) =>
      addToast({ type: 'info', message }, options),
  };
}
