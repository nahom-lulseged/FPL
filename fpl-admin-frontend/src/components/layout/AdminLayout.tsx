import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useUiStore } from '@/store/uiStore';

export function AdminLayout() {
  const location = useLocation();
  const isMobileNavOpen = useUiStore((state) => state.isMobileNavOpen);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, setMobileNavOpen]);

  useEffect(() => {
    document.body.style.overflow = isMobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    if (!isMobileNavOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileNavOpen(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [isMobileNavOpen, setMobileNavOpen]);

  return (
    <div className="app-shell flex h-dvh max-h-dvh min-h-screen overflow-hidden">
      <Sidebar variant="desktop" />
      {isMobileNavOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          />
          <Sidebar variant="mobile" onNavigate={() => setMobileNavOpen(false)} />
        </>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="dashboard-scroll flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1800px]"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
