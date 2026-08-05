import { useEffect, useMemo, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { GameweekSwitcher } from '@/components/layout/GameweekSwitcher';
import { HeroBanner } from '@/components/layout/HeroBanner';
import { useMyTeam } from '@/hooks/useMyTeam';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

export function Navbar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { hasNoTeam, teamRef } = useMyTeam();
  const isMobileNavOpen = useUiStore((state) => state.isMobileNavOpen);
  const isUserMenuOpen = useUiStore((state) => state.isUserMenuOpen);
  const toggleMobileNav = useUiStore((state) => state.toggleMobileNav);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const toggleUserMenu = useUiStore((state) => state.toggleUserMenu);
  const setUserMenuOpen = useUiStore((state) => state.setUserMenuOpen);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const teamLink = hasNoTeam || !teamRef ? '/squad-selection' : '/my-team';
  const myTeamLabel = hasNoTeam || !teamRef ? 'Squad Selection' : 'My Team';

  const navLinks = useMemo(
    () => [
      { to: '/home', label: 'Home' },
      { to: teamLink, label: myTeamLabel },
      { to: '/transfers', label: 'Transfers' },
      { to: '/leagues', label: 'Leagues' },
      { to: '/wallet', label: 'Wallet' },
      { to: '/fixtures', label: 'Fixtures' },
    ],
    [myTeamLabel, teamLink],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setUserMenuOpen]);

  async function handleLogout() {
    setUserMenuOpen(false);
    await logout();
    navigate('/telegram-auth');
  }

  const initials = getInitials(user?.displayName, user?.email);

  return (
    <header>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <HeroBanner />
      <div className="bg-[#37003c]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-3 py-2 sm:px-4 lg:px-5">
          <div className="flex w-9 shrink-0 items-center justify-start">
            <button
              type="button"
              className="rounded p-2 text-white hover:bg-white/10 md:hidden"
              onClick={toggleMobileNav}
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileNavOpen}
            >
              <span className="text-xl">{isMobileNavOpen ? '✕' : '☰'}</span>
            </button>
          </div>

          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex lg:gap-2">
            {navLinks.map((link) => (
              <NavLinkItem key={link.to} to={link.to}>
                {link.label}
              </NavLinkItem>
            ))}
          </nav>

          <div className="relative flex w-9 shrink-0 justify-end" ref={userMenuRef}>
            <button
              type="button"
              onClick={toggleUserMenu}
              className="group relative flex h-9 w-9 items-center justify-center rounded-full p-[2px]"
              style={{
                background:
                  'linear-gradient(135deg, #22d3ee 0%, #3b82f6 25%, #ec4899 55%, #f97316 80%, #ef4444 100%)',
              }}
              aria-label="Account menu"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-100"
              />
              <span className="relative z-10 flex h-full w-full items-center justify-center rounded-full bg-[#37003c] text-xs font-semibold tracking-wide text-white transition group-hover:bg-white group-hover:text-[#37003c]">
                {initials}
              </span>
            </button>
            {isUserMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-48 rounded-md border border-white/10 bg-[#1a0024] py-1 shadow-xl"
              >
                <p className="border-b border-white/10 px-3 py-2 text-xs text-white/70">
                  {user?.email}
                </p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLogout()}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                >
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {isMobileNavOpen ? (
          <div className="border-t border-white/10 px-4 py-4 md:hidden">
            <div className="mb-4">
              <GameweekSwitcher />
            </div>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <NavLinkItem
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileNavOpen(false)}
                  className="block py-2"
                >
                  {link.label}
                </NavLinkItem>
              ))}
            </nav>
          </div>
        ) : null}

        <div className="hidden border-t border-white/10 xl:block">
          <div className="mx-auto flex max-w-[1400px] px-3 py-1.5 sm:px-4 lg:px-5">
            <GameweekSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}

function getInitials(displayName?: string | null, email?: string | null): string {
  const name = displayName?.trim();
  if (name) {
    return name[0]!.toUpperCase();
  }

  const local = email?.split('@')[0]?.trim();
  if (local && local.length > 0) {
    return local[0]!.toUpperCase();
  }

  return 'M';
}

function NavLinkItem({
  to,
  children,
  onClick,
  className,
}: {
  to: string;
  children: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'px-3 py-2 text-sm font-medium transition',
          isActive
            ? 'text-white underline decoration-white decoration-[3px] underline-offset-8'
            : 'text-white/85 hover:text-white',
          className,
        )
      }
    >
      {children}
    </NavLink>
  );
}
