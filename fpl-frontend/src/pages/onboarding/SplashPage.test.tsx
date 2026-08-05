import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SplashPage } from '@/pages/onboarding/SplashPage';

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean; isHydrated: boolean }) => unknown) =>
    selector({ isAuthenticated: false, isHydrated: false }),
}));

vi.mock('@/lib/telegram', () => ({
  useTelegram: () => ({ isTelegram: false }),
}));

describe('SplashPage', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the animated brand logo while startup is loading', () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <SplashPage />
      </MemoryRouter>,
    );

    const logo = screen.getByRole('img', { name: 'Fantasy Ethiopia' });
    expect(logo).toHaveAttribute('src', '/brand/fpl-team-logo.png');
    expect(logo).toHaveClass('splash-logo__image');
    expect(screen.getByText('Fantasy Ethiopia')).toHaveClass('splash-brand-title');
    expect(document.querySelector('.splash-loader')).toBeInTheDocument();
  });
});
