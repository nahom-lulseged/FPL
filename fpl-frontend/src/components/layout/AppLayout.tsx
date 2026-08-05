import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { ToastContainer } from '@/components/common/Toast';
import { FullPageSpinner } from '@/components/common/Spinner';
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary';
import { Footer } from '@/components/layout/Footer';
import { LiveUpdatesProvider } from '@/components/layout/LiveUpdatesProvider';
import { NetworkStatusBanner } from '@/components/layout/NetworkStatusBanner';
import { Navbar } from '@/components/layout/Navbar';

export function AppLayout() {
  return (
    <LiveUpdatesProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <NetworkStatusBanner />
        <main id="main-content" className="flex-1 px-3 py-4 sm:px-4 sm:py-5 lg:mx-auto lg:w-full lg:max-w-[1840px] lg:px-5">
          <AppErrorBoundary title="This page encountered an error">
            <Suspense fallback={<FullPageSpinner />}>
              <Outlet />
            </Suspense>
          </AppErrorBoundary>
        </main>
        <Footer />
      </div>
      <ToastContainer />
    </LiveUpdatesProvider>
  );
}
