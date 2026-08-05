import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeaguesListPage } from './LeaguesListPage';

const refetch = vi.fn();
vi.mock('@/hooks/useMyTeam', () => ({ useMyTeam: () => ({ hasNoTeam: false, isLoading: false }) }));
vi.mock('@/hooks/useMyLeagues', () => ({ useMyLeagues: () => ({ data: { data: [] }, isLoading: false, isError: false, refetch }) }));

describe('LeaguesListPage clone presentation', () => {
  beforeEach(() => refetch.mockClear());

  it('keeps join and configuration flows available', () => {
    render(<MemoryRouter><LeaguesListPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /join a league/i })).toHaveAttribute('href', '/leagues/join');
    expect(screen.getByRole('link', { name: /configure leagues/i })).toHaveAttribute('href', '/leagues/configure');
  });

  it('switches to the cups presentation without replacing league behavior', () => {
    render(<MemoryRouter><LeaguesListPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Cups' }));
    expect(screen.getByRole('heading', { name: 'General Cups' })).toBeInTheDocument();
  });
});
