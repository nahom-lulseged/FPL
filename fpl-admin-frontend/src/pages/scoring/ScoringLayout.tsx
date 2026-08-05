import { Navigate, Outlet } from 'react-router-dom';
import { ScoringSubNav } from '@/components/scoring/ScoringSubNav';

export function ScoringLayout() {
  return (
    <div>
      <h1 className="text-xl font-bold text-fpl-gray-900">Scoring & Points</h1>
      <p className="mt-1 text-sm text-fpl-gray-500">
        Preview and commit point corrections or gameweek recalculations
      </p>
      <ScoringSubNav />
      <Outlet />
    </div>
  );
}

export function ScoringIndexRedirect() {
  return <Navigate to="/scoring/correction" replace />;
}
