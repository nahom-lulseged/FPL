import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FullPageSpinner, Spinner } from '@/components/common/Spinner';

describe('loading indicators', () => {
  it('uses the branded logo for full-page loading', () => {
    render(<FullPageSpinner />);

    const status = screen.getByRole('status', { name: /loading fantasy ethiopia/i });
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Fantasy Ethiopia')).toBeInTheDocument();
    expect(status.querySelector('img')).toHaveAttribute('src', '/brand/fpl-team-logo.png');
  });

  it('keeps the compact circular spinner for inline controls', () => {
    render(<Spinner size="sm" />);

    expect(screen.getByRole('status', { name: 'Loading' })).toHaveClass('animate-spin');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
