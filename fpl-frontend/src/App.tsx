import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary';
import { router } from '@/router';
import { useAuthStore } from '@/store/authStore';

export function App() {
  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage);

  useEffect(() => {
    void hydrateFromStorage();
  }, [hydrateFromStorage]);

  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
    </AppErrorBoundary>
  );
}
