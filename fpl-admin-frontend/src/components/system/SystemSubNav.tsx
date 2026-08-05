import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const tabs = [
  { to: '/system/health', label: 'Health' },
  { to: '/system/queues', label: 'Queues' },
  { to: '/system/logs', label: 'Logs' },
  { to: '/system/alerts', label: 'Alerts' },
  { to: '/system/audit', label: 'Audit' },
] as const;

export function SystemSubNav() {
  return (
    <nav className="mb-4 flex gap-2 border-b border-fpl-gray-200">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            clsx(
              'border-b-2 px-3 py-2 text-sm font-medium transition',
              isActive
                ? 'border-fpl-purple text-fpl-purple'
                : 'border-transparent text-fpl-gray-500 hover:text-fpl-gray-900',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
