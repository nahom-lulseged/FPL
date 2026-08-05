import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const tabs = [
  { to: '/finance/wallets', label: 'Wallets' },
  { to: '/finance/deposits', label: 'Deposits' },
  { to: '/finance/withdrawals', label: 'Withdrawals' },
  { to: '/finance/transactions', label: 'Transactions' },
  { to: '/finance/payouts', label: 'Payouts' },
  { to: '/finance/disputes', label: 'Disputes' },
  { to: '/finance/commission', label: 'Commission' },
];

export function FinanceSubNav() {
  return (
    <nav className="mt-4 flex gap-4 border-b border-fpl-gray-200">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            clsx(
              'pb-2 text-sm font-medium',
              isActive
                ? 'border-b-2 border-fpl-purple text-fpl-purple'
                : 'text-fpl-gray-500 hover:text-fpl-gray-700',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
