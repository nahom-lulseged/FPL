import { NavLink } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  Activity, BarChart3, Bell, CalendarDays, ChevronDown, ChevronLeft, CircleDollarSign,
  DatabaseZap, FileBarChart, Gauge, Headphones, LayoutDashboard, LogOut, Megaphone,
  ScrollText, ShieldCheck, Trophy, UserCog, UserRound, UsersRound, WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { useUiStore } from '@/store/uiStore';

export interface AdminNavItem { to: string; label: string; icon: LucideIcon }
interface AdminNavGroup { label: string; items: AdminNavItem[] }

export const navGroups: AdminNavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/reports', label: 'Reports', icon: FileBarChart },
    ],
  },
  { label: 'People', items: [
      { to: '/users', label: 'Users', icon: UsersRound },
      { to: '/admins', label: 'Admins', icon: UserCog },
      { to: '/support', label: 'Support', icon: Headphones },
  ]},
  {
    label: 'Competition',
    items: [
      { to: '/content/players', label: 'Players', icon: UserRound },
      { to: '/content/teams', label: 'Clubs', icon: ShieldCheck },
      { to: '/content/fixtures', label: 'Matches', icon: CalendarDays },
      { to: '/content/gameweeks', label: 'Gameweeks', icon: Trophy },
      { to: '/leagues', label: 'Leagues', icon: Trophy },
      { to: '/scoring/correction', label: 'Scoring', icon: Activity },
      { to: '/ingestion', label: 'Data sync', icon: DatabaseZap },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/finance/wallets', label: 'Wallets', icon: WalletCards },
      { to: '/finance/transactions', label: 'Transactions', icon: Activity },
      { to: '/finance/deposits', label: 'Deposits', icon: CircleDollarSign },
      { to: '/finance/withdrawals', label: 'Withdrawals', icon: CircleDollarSign },
      { to: '/finance/payouts', label: 'Payouts', icon: Trophy },
      { to: '/finance/disputes', label: 'Disputes', icon: ShieldCheck },
      { to: '/finance/commission', label: 'Revenue', icon: BarChart3 },
    ],
  },
  {
    label: 'Communications',
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/announcements', label: 'Announcements', icon: Megaphone },
      { to: '/system/alerts', label: 'System alerts', icon: Bell },
    ],
  },
  { label: 'Administration', items: [
    { to: '/system/health', label: 'Health', icon: Gauge },
    { to: '/system/queues', label: 'Queues', icon: DatabaseZap },
    { to: '/system/logs', label: 'Logs', icon: ScrollText },
    { to: '/system/audit', label: 'Audit', icon: ShieldCheck },
  ]},
] ;

export const allNavItems: AdminNavItem[] = navGroups.flatMap((group) => group.items);

interface SidebarProps {
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
}

export function Sidebar({ variant = 'desktop', onNavigate }: SidebarProps) {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const user = useAdminAuthStore((state) => state.user);
  const logout = useAdminAuthStore((state) => state.logout);
  const isMobile = variant === 'mobile';
  const compact = !isMobile && collapsed;
  const mobileNavRef = useRef<HTMLElement>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => Object.fromEntries(navGroups.map((group) => [group.label, true])));

  useEffect(() => {
    if (!isMobile) return;
    window.requestAnimationFrame(() => mobileNavRef.current?.querySelector<HTMLElement>('a')?.focus());
  }, [isMobile]);

  return (
    <aside
      ref={mobileNavRef}
      role={isMobile ? 'dialog' : undefined}
      aria-modal={isMobile ? true : undefined}
      aria-label={isMobile ? 'Admin navigation menu' : undefined}
      className={clsx(
        'sidebar-surface flex h-full shrink-0 flex-col transition-[width,transform] duration-300',
        isMobile ? 'fixed inset-y-0 left-0 z-50 w-[280px] lg:hidden' : 'hidden lg:flex',
        !isMobile && (compact ? 'w-[84px]' : 'w-[280px]'),
      )}
    >
      <div className="flex h-20 items-center gap-3 border-b border-white/8 px-5">
        <div className="brand-mark" aria-hidden="true">F</div>
        {!compact ? (
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight text-white">FPL Admin</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/70">Control centre</p>
          </div>
        ) : null}
        {!isMobile ? (
          <button type="button" onClick={toggleSidebar} className="icon-button ml-auto" aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}>
            <ChevronLeft className={clsx('h-4 w-4 transition-transform', compact && 'rotate-180')} />
          </button>
        ) : null}
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-5" aria-label="Admin navigation">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            {!compact ? <button type="button" className="nav-group-button" onClick={() => setOpenGroups((state) => ({...state,[group.label]:!state[group.label]}))} aria-expanded={openGroups[group.label]}><span>{group.label}</span><ChevronDown className={clsx('h-3.5 w-3.5 transition-transform', !openGroups[group.label] && '-rotate-90')}/></button> : null}
            <div className={clsx('space-y-1', !compact && !openGroups[group.label] && 'hidden')}>
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={`${label}-${to}`}
                  to={to}
                  onClick={onNavigate}
                  title={compact ? label : undefined}
                  className={({ isActive }) => clsx('nav-item', isActive && 'nav-item-active', compact && 'justify-center px-0')}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                  {!compact ? <span className="truncate">{label}</span> : null}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/8 p-3">
        <div className={clsx('mb-2 flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3', compact && 'justify-center')}>
          <div className="avatar-ring">{(user?.displayName || user?.email || 'A').charAt(0).toUpperCase()}</div>
          {!compact ? <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{user?.displayName || 'Administrator'}</p><p className="truncate text-xs text-slate-500">{user?.email}</p></div> : null}
        </div>
        <button type="button" className={clsx('nav-item w-full text-rose-300 hover:text-rose-200', compact && 'justify-center px-0')} onClick={() => void logout()}>
          <LogOut className="h-[18px] w-[18px]" />{!compact ? <span>Logout</span> : null}
        </button>
      </div>
    </aside>
  );
}
