import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { TELEGRAM_PURPLE_THEME } from '@/lib/telegramCore';
import { isTeamWorkflowPath } from '@/lib/teamRoutes';
import { BrandMark, TelegramAppShell } from './TelegramAppShell';
import { desktopNavigation, mobileNavigation } from './navigation';

vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(() => ({
    data: { balanceDisplay: 'ETB 1,200.00' },
    isError: false,
  })),
}));

vi.mock('@/components/wallet/DepositModal', () => ({
  DepositModal: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    open ? <div role="dialog" aria-label="Deposit with Telebirr"><button type="button" onClick={onClose}>Close</button></div> : null
  ),
}));

vi.mock('@/lib/telegram', () => ({
  useTelegram: () => ({ webApp: null, user: null, isTelegram: false }),
}));

function renderShell(path = '/home') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    {
      path: '/',
      element: <TelegramAppShell />,
      children: [
        { path: 'home', element: <main>Home content</main> },
        { path: 'wallet', element: <main>Wallet content</main> },
        { path: 'notifications', element: <main>Notifications content</main> },
        { path: 'squad-selection', element: <main>Workflow content</main> },
      ],
    },
  ], { initialEntries: [path] });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('TelegramAppShell mobile navigation', () => {
  it('adds More as the sixth mobile tab after Profile', () => {
    expect(mobileNavigation.map((item) => [item.label, item.to])).toEqual([
      ['Home', '/home'],
      ['Team', '/team'],
      ['Leagues', '/leagues'],
      ['Wallet', '/wallet'],
      ['Profile', '/profile'],
      ['More', '/more'],
    ]);
  });

  it('keeps the desktop navigation at five product tabs', () => {
    expect(desktopNavigation.map((item) => [item.label, item.to])).toEqual([
      ['Home', '/home'],
      ['Team', '/team'],
      ['Leagues', '/leagues'],
      ['Wallet', '/wallet'],
      ['Profile', '/profile'],
    ]);
  });

  it('uses the purple Telegram chrome colors', () => {
    expect(TELEGRAM_PURPLE_THEME).toEqual({
      header: '#26002C',
      background: '#1F0024',
    });
  });

  it('uses Fantasy Ethiopia for the brand mark', () => {
    render(<BrandMark />);

    expect(screen.getByLabelText('Fantasy Ethiopia')).toBeInTheDocument();
    expect(screen.getByText('ETHIOPIA')).toBeInTheDocument();
    expect(screen.queryByText('PREMIER LEAGUE')).not.toBeInTheDocument();
  });

  it('renders the pinned wallet navigation on normal authenticated routes', () => {
    renderShell('/wallet');

    const homeLogo = screen.getByRole('link', { name: /fantasy ethiopia home/i });
    expect(homeLogo).toHaveAttribute('href', '/home');
    expect(homeLogo).not.toHaveTextContent(/fantasy ethiopia/i);
    expect(screen.getByText('ETB ••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reveal wallet balance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /deposit/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /notifications/i })).toHaveAttribute('href', '/notifications');
  });

  it('toggles the wallet balance between masked and visible states', async () => {
    const user = userEvent.setup();
    renderShell('/home');

    await user.click(screen.getByRole('button', { name: /reveal wallet balance/i }));
    expect(screen.getByText('ETB 1,200.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mask wallet balance/i })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /mask wallet balance/i }));
    expect(screen.getByText('ETB ••••••')).toBeInTheDocument();
    expect(screen.queryByText('ETB 1,200.00')).not.toBeInTheDocument();
  });

  it('opens and closes the existing deposit modal from the pinned header', async () => {
    const user = userEvent.setup();
    renderShell('/home');

    await user.click(screen.getByRole('button', { name: /deposit/i }));
    expect(screen.getByRole('dialog', { name: /deposit with telebirr/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog', { name: /deposit with telebirr/i })).not.toBeInTheDocument();
  });

  it.each([
    '/team',
    '/my-team',
    '/my-team/history',
    '/squad-selection',
    '/transfers',
    '/transfers/replace/player-1',
    '/transfers/review',
    '/players/player-1',
  ])('hides app navigation throughout the Team workflow on %s', (pathname) => {
    expect(isTeamWorkflowPath(pathname)).toBe(true);
  });

  it.each(['/home', '/leagues', '/wallet', '/profile', '/stats/dream-team'])(
    'keeps app navigation available outside the Team workflow on %s',
    (pathname) => {
      expect(isTeamWorkflowPath(pathname)).toBe(false);
    },
  );
});
