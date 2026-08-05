import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Eye, EyeOff, Plus } from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import fantasyEthiopiaLogo from '@/assets/fantasy-ethiopia-logo.png';
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary';
import { FullPageSpinner } from '@/components/common/Spinner';
import { ToastContainer } from '@/components/common/Toast';
import { LiveUpdatesProvider } from '@/components/layout/LiveUpdatesProvider';
import { NetworkStatusBanner } from '@/components/layout/NetworkStatusBanner';
import { DepositModal } from '@/components/wallet/DepositModal';
import { useWallet } from '@/hooks/useWallet';
import { useTelegram } from '@/lib/telegram';
import { isTeamWorkflowPath } from '@/lib/teamRoutes';
import { useAuthStore } from '@/store/authStore';
import { Suspense } from 'react';
import { desktopNavigation, mobileNavigation, type NavigationItemConfig } from './navigation';

export function TelegramAppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { webApp, user: telegramUser, isTelegram } = useTelegram();
  const appUser = useAuthStore((state) => state.user);
  const isRoot = ['/home', '/team', '/leagues', '/wallet', '/profile', '/more'].includes(location.pathname);
  const immersive = ['/home', '/my-team', '/squad-selection', '/transfers', '/leagues'].includes(location.pathname);
  const workflowChromeHidden = isTeamWorkflowPath(location.pathname);
  const wallet = useWallet();
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);

  useEffect(() => {
    const back = () => navigate(-1);
    if (!webApp?.BackButton) return;
    if (isRoot) webApp.BackButton.hide();
    else {
      webApp.BackButton.show();
      webApp.BackButton.onClick(back);
    }
    return () => webApp.BackButton?.offClick(back);
  }, [isRoot, navigate, webApp]);

  const displayName = telegramUser?.first_name ?? appUser?.displayName ?? 'Manager';
  const balanceDisplay = !wallet.isError && wallet.data?.balanceDisplay ? wallet.data.balanceDisplay : 'ETB 0.00';
  const maskedBalance = 'ETB ••••••';

  return (
    <LiveUpdatesProvider>
      <div className={clsx('telegram-app-shell', workflowChromeHidden && 'telegram-app-shell--workflow')}>
        <aside className="desktop-rail" aria-label="Primary navigation" hidden={workflowChromeHidden}>
          <BrandMark />
          <nav className="desktop-rail__nav">
            {desktopNavigation.map((item) => <NavigationItem key={item.to} {...item} desktop />)}
          </nav>
          <div className="desktop-rail__manager">
            <span className="manager-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
            <span><small>Manager</small>{displayName}</span>
          </div>
        </aside>

        <div className={clsx('telegram-app-main', !isTelegram && 'telegram-app-main--browser', workflowChromeHidden && 'telegram-app-main--workflow')}>
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <header className={clsx('mobile-app-header', immersive && 'mobile-app-header--immersive')} hidden={workflowChromeHidden}>
            <NavLink to="/home" className="mobile-app-header__brand" aria-label="Fantasy Ethiopia home">
              <span className="header-avatar">
                <img src={telegramUser?.photo_url ?? fantasyEthiopiaLogo} alt="" aria-hidden="true" />
                <span className="header-avatar__online" />
              </span>
            </NavLink>
            <div className="mobile-app-header__wallet" aria-live="polite">
              <span className="mobile-app-header__wallet-copy">
                <small>My Wallet</small>
                <strong>{balanceVisible ? balanceDisplay : maskedBalance}</strong>
              </span>
              <button
                type="button"
                className="wallet-visibility-button"
                onClick={() => setBalanceVisible((visible) => !visible)}
                aria-label={balanceVisible ? 'Mask wallet balance' : 'Reveal wallet balance'}
                aria-pressed={balanceVisible}
              >
                {balanceVisible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <button type="button" className="header-deposit-button" onClick={() => setDepositOpen(true)}>
              <Plus size={18} /> Deposit
            </button>
            <NavLink to="/notifications" className="header-icon-button" aria-label="Notifications">
              <Bell size={20} />
              <span className="notification-dot" aria-label="Unread notifications" />
            </NavLink>
          </header>
          <NetworkStatusBanner />
          <main id="main-content" className="telegram-content">
            <AppErrorBoundary title="This page encountered an error">
              <Suspense fallback={<FullPageSpinner />}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    <Outlet />
                  </motion.div>
                </AnimatePresence>
              </Suspense>
            </AppErrorBoundary>
          </main>
          <nav className="mobile-bottom-nav" aria-label="Primary navigation" hidden={workflowChromeHidden}>
            {mobileNavigation.map((item) => <NavigationItem key={item.to} {...item} />)}
          </nav>
        </div>
      </div>
      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
      <ToastContainer />
    </LiveUpdatesProvider>
  );
}


export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={clsx('brand-mark', compact && 'brand-mark--compact')} aria-label="Fantasy Ethiopia">
      <span className="brand-mark__icon">
        <img src={fantasyEthiopiaLogo} alt="" aria-hidden="true" />
      </span>
      {!compact ? <span><strong>Fantasy</strong><small>ETHIOPIA</small></span> : null}
    </div>
  );
}

function NavigationItem({ to, label, icon: Icon, desktop = false }: NavigationItemConfig & { desktop?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => clsx(desktop ? 'desktop-nav-item' : 'mobile-nav-item', isActive && 'is-active')}
    >
      <Icon size={desktop ? 20 : 21} strokeWidth={2} />
      <span>{label}</span>
    </NavLink>
  );
}
