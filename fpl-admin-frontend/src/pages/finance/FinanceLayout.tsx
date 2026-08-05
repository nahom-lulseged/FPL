import { Navigate, Outlet } from 'react-router-dom';
import { FinanceSubNav } from '@/components/finance/FinanceSubNav';

export function FinanceLayout() {
  return (
    <div>
      <h1 className="text-xl font-bold text-fpl-gray-900">Finance</h1>
      <p className="mt-1 text-sm text-fpl-gray-500">
        Wallet oversight, deposits, withdrawals, payouts, and commission tracking
      </p>
      <FinanceSubNav />
      <Outlet />
    </div>
  );
}

export function FinanceIndexRedirect() {
  return <Navigate to="/finance/wallets" replace />;
}
