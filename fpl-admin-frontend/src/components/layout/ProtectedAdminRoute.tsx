import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageSpinner } from '@/components/common/Spinner';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { isAdmin } from '@/types/user';

export function ProtectedAdminRoute() {
  const location = useLocation();
  const user = useAdminAuthStore((state) => state.user);
  const isAuthenticated = useAdminAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAdminAuthStore((state) => state.isHydrated);

  if (!isHydrated) {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated || !isAdmin(user)) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function PublicOnlyAdminRoute() {
  const user = useAdminAuthStore((state) => state.user);
  const isAuthenticated = useAdminAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAdminAuthStore((state) => state.isHydrated);

  if (!isHydrated) {
    return <FullPageSpinner />;
  }

  if (isAuthenticated && isAdmin(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
