import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { App } from '@/App';
import 'lenis/dist/lenis.css';
import '@/styles/globals.css';
import '@/styles/premium.css';
import '@/styles/workflows.css';
import '@/lib/i18n';
import { TelegramProvider } from '@/lib/telegram';

onlineManager.setEventListener((setOnline) => {
  const onOnline = () => setOnline(true);
  const onOffline = () => setOnline(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TelegramProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </TelegramProvider>
  </StrictMode>,
);
