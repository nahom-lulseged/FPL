import { Navigate, Outlet } from 'react-router-dom';
import { SystemSubNav } from '@/components/system/SystemSubNav';

export function SystemLayout() {
  return (
    <div>
      <h1 className="text-xl font-bold text-fpl-gray-900">System Monitoring</h1>
      <p className="mt-1 text-sm text-fpl-gray-500">
        Health metrics, job queues, logs, and alert configuration
      </p>
      <SystemSubNav />
      <Outlet />
    </div>
  );
}

export function SystemIndexRedirect() {
  return <Navigate to="/system/health" replace />;
}
