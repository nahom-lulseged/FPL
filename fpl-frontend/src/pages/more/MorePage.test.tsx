import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MorePage } from './MorePage';

describe('MorePage', () => {
  it('shows the fantasy resource links with their existing destinations', () => {
    render(
      <MemoryRouter>
        <MorePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /fixtures/i })).toHaveAttribute('href', '/match-center');
    expect(screen.getByRole('link', { name: /fixture difficulty rating/i })).toHaveAttribute('href', '/fixtures');
    expect(screen.getByRole('link', { name: /player statistics/i })).toHaveAttribute('href', '/leaderboard');
    expect(screen.getByRole('link', { name: /set piece takers/i })).toHaveAttribute('href', '/stats/dream-team');
  });
});
