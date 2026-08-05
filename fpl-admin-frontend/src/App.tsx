import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ToastContainer } from '@/components/common/Toast';
import { router } from '@/router';
import { useAdminAuthStore } from '@/store/adminAuthStore';

export function App() {
  const hydrateFromStorage = useAdminAuthStore((state) => state.hydrateFromStorage);

  useEffect(() => {
    void hydrateFromStorage();
  }, [hydrateFromStorage]);

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  );
}
