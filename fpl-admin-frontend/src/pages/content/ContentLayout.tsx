import { Navigate, Outlet } from 'react-router-dom';
import { ContentSubNav } from '@/components/content/ContentSubNav';

export function ContentLayout() {
  return (
    <div>
      <h1 className="text-xl font-bold text-fpl-gray-900">Content Management</h1>
      <p className="mt-1 text-sm text-fpl-gray-500">
        Manually override player, team, fixture, and gameweek data
      </p>
      <ContentSubNav />
      <Outlet />
    </div>
  );
}

export function ContentIndexRedirect() {
  return <Navigate to="/content/players" replace />;
}
