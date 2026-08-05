import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';

vi.mock('@/api/gameweeks.api', () => ({
  getCurrentGameweek: vi.fn(async () => ({
    id: 'gw-1',
    number: 1,
    deadline: '2026-08-21T20:30:00.000Z',
    status: 'UPCOMING',
    isCurrent: true,
  })),
}));

vi.mock('@/hooks/useMyTeam', () => ({
  useMyTeam: vi.fn(() => ({
    hasNoTeam: false,
    team: {
      id: 'team-1',
      name: 'papa united',
      gameweekTotal: 48,
      totalPoints: 126,
    },
  })),
}));

vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(() => ({ data: { balanceDisplay: 'ETB 1,200.00' } })),
}));

vi.mock('@/hooks/useLedgerHistory', () => ({
  useLedgerHistory: vi.fn(() => ({ data: { data: [] } })),
}));

vi.mock('@/hooks/useStakedLeagues', () => ({
  useStakedLeagues: vi.fn(() => ({ data: { data: [{ id: 'league-1', potTotalMinor: 150_000_00 }] } })),
}));

vi.mock('@/hooks/useFixtures', () => ({
  useFixtures: vi.fn(() => ({
    isLoading: false,
    data: {
      data: [
        {
          id: 'fixture-1',
          started: true,
          finished: false,
          minutes: 42,
          homeScore: 1,
          awayScore: 0,
          kickoffTime: '2026-08-21T17:30:00.000Z',
          homeDifficulty: 3,
          awayDifficulty: 4,
          homeTeam: { shortName: 'ARS' },
          awayTeam: { shortName: 'CHE' },
        },
      ],
    },
  })),
}));

vi.mock('@/hooks/useFplCatalog', () => ({
  useFplOverview: vi.fn(() => ({ data: { teams: [] } })),
}));

function renderHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HomePage responsive FPL clone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes the mode strip and old identity card while keeping Home actions', () => {
    const { container } = renderHome();
    const root = container.querySelector('.fpl-clone-home');
    const hero = root?.firstElementChild;

    expect(screen.queryByRole('tablist', { name: /fantasy game mode/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /challenge/i })).not.toBeInTheDocument();
    expect(hero).toHaveClass('fpl-manager-hero');
    expect(hero?.querySelector('.fpl-manager-hero__identity')).not.toBeInTheDocument();
    expect(hero?.querySelector('.fpl-team-badge')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open manager profile/i })).not.toBeInTheDocument();
    const actions = hero?.querySelector('.fpl-manager-hero__actions');
    expect(actions).toContainElement(screen.getByRole('link', { name: /pick team/i }));
    expect(actions).toContainElement(screen.getByRole('link', { name: /transfers/i }));
    expect(actions?.children).toHaveLength(2);
  });

  it('keeps core home actions wired to existing routes', () => {
    renderHome();

    expect(screen.queryByRole('link', { name: /^fixtures$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /fixture difficulty rating/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /player statistics/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /set piece takers/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /pick team/i })).toHaveAttribute('href', '/my-team');
    expect(screen.getByRole('link', { name: /transfers/i })).toHaveAttribute('href', '/transfers');
    expect(screen.getByRole('link', { name: /deposit/i })).toHaveAttribute('href', '/wallet?deposit=open');
    expect(screen.getByRole('link', { name: /withdraw/i })).toHaveAttribute('href', '/wallet?withdraw=open');
    expect(screen.getByRole('link', { name: /join leagues/i })).toHaveAttribute('href', '/leagues/join');
  });

  it('shows the formatted gameweek deadline date', async () => {
    renderHome();

    expect(await screen.findByText(/Deadline: Friday 21 Aug at 23:30/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Gameweek 1/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/deadline to be announced/i)).not.toBeInTheDocument();
  });

  it('switches the Leagues and Cups standings without placeholder tabs', async () => {
    const user = userEvent.setup();
    renderHome();

    expect(screen.getByRole('heading', { name: /general leagues/i })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /cups/i }));

    expect(screen.getByRole('heading', { name: /general cups/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ethiopia cup/i })).toHaveAttribute(
      'href',
      '/leaderboard?scope=ethiopia&view=cups',
    );
    expect(screen.queryByRole('link', { name: /join leagues/i })).not.toBeInTheDocument();
  });
});
