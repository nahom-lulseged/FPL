import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Menu, Moon, Plus, Search, Sun, X } from 'lucide-react';
import { allNavItems } from '@/components/layout/Sidebar';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { useUiStore } from '@/store/uiStore';
import { useDashboardOverview } from '@/hooks/useDashboardOverview';
import { useDeadlineCountdown } from '@/lib/formatters';

const quickLinks = [
  { label: 'Manage players', to: '/content/players' },
  { label: 'Manage fixtures', to: '/content/fixtures' },
  { label: 'Update gameweek', to: '/content/gameweeks' },
  { label: 'Manage leagues', to: '/leagues' },
  { label: 'Sync FPL data', to: '/ingestion' },
  { label: 'Alert settings', to: '/system/alerts' },
] as const;

export function Topbar() {
  const navigate = useNavigate();
  const user = useAdminAuthStore((state) => state.user);
  const logout = useAdminAuthStore((state) => state.logout);
  const isMobileNavOpen = useUiStore((state) => state.isMobileNavOpen);
  const toggleMobileNav = useUiStore((state) => state.toggleMobileNav);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const { data } = useDashboardOverview();
  const gameweek = data?.currentGameweek ?? data?.nextGameweek;
  const countdown = useDeadlineCountdown(gameweek?.deadline ?? '');
  const alertCount = data ? Number(!data.system.dbOk) + Number(!data.system.redisOk) + Number(data.system.lastSyncSuccess === false) : 0;
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const menusRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allNavItems.slice(0, 6);
    return allNavItems.filter((item) => item.label.toLowerCase().includes(query)).slice(0, 7);
  }, [search]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menusRef.current && !menusRef.current.contains(event.target as Node)) {
        setSearchOpen(false); setQuickOpen(false); setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <header className="topbar" ref={menusRef}>
      <button type="button" className="icon-button lg:hidden" onClick={toggleMobileNav} aria-label="Toggle navigation" aria-expanded={isMobileNavOpen}>
        {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div className="relative min-w-0 flex-1 md:max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onFocus={() => setSearchOpen(true)}
          onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setSearchOpen(false);
            if (event.key === 'Enter' && results[0]) { navigate(results[0].to); setSearchOpen(false); setSearch(''); }
          }}
          className="search-input"
          placeholder="Search workspace..."
          aria-label="Search admin navigation"
        />
        {searchOpen ? (
          <div className="menu-panel left-0 top-[calc(100%+10px)] w-full min-w-64">
            {results.length ? results.map((item) => (
              <Link key={`${item.label}-${item.to}`} to={item.to} onClick={() => { setSearchOpen(false); setSearch(''); }} className="menu-row">{item.label}</Link>
            )) : <p className="px-4 py-5 text-center text-sm text-slate-500">No destination found</p>}
          </div>
        ) : null}
      </div>

      <div className="hidden min-w-52 items-center justify-center gap-3 xl:flex">
        <div className="h-8 w-px bg-[var(--line)]" />
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{gameweek ? `Gameweek ${gameweek.number}` : 'Gameweek'}</p><p className="text-sm font-semibold text-[var(--text)]">{gameweek ? countdown : 'Not scheduled'}</p></div>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Link to="/system/health" className="icon-button relative" aria-label={`${alertCount} system notifications`}>
          <Bell className="h-[18px] w-[18px]" />
          {alertCount > 0 ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[var(--panel-solid)]" /> : null}
        </Link>
        <button type="button" className="icon-button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
        <div className="relative">
          <button type="button" className="quick-add" onClick={() => { setQuickOpen((value) => !value); setAccountOpen(false); }} aria-expanded={quickOpen}>
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">Quick add</span>
          </button>
          {quickOpen ? <div className="menu-panel right-0 top-[calc(100%+10px)] w-56"><p className="menu-label">Quick actions</p>{quickLinks.map((item) => <Link key={item.to} to={item.to} className="menu-row" onClick={() => setQuickOpen(false)}>{item.label}</Link>)}</div> : null}
        </div>
        <div className="relative">
          <button type="button" className="account-button" onClick={() => { setAccountOpen((value) => !value); setQuickOpen(false); }} aria-expanded={accountOpen}>
            <span className="avatar-ring">{(user?.displayName || user?.email || 'A').charAt(0).toUpperCase()}</span>
            <span className="hidden max-w-28 truncate text-sm font-semibold lg:inline">{user?.displayName || 'Admin'}</span>
            <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" />
          </button>
          {accountOpen ? <div className="menu-panel right-0 top-[calc(100%+10px)] w-56"><div className="border-b border-[var(--line)] px-4 py-3"><p className="truncate text-sm font-semibold text-[var(--text)]">{user?.displayName || 'Administrator'}</p><p className="truncate text-xs text-slate-500">{user?.email}</p></div><button type="button" className="menu-row w-full text-rose-400" onClick={() => void logout()}>Log out</button></div> : null}
        </div>
      </div>
    </header>
  );
}
