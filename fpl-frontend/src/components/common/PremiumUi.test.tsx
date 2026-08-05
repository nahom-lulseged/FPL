import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { PremiumCard } from './PremiumCard';
import { ColorToken, SegmentedControl } from './PremiumUi';

describe('premium UI primitives', () => {
  it('keeps existing button behavior while exposing premium variants', () => {
    render(<Button variant="success">Save team</Button>);
    expect(screen.getByRole('button', { name: 'Save team' })).toHaveClass(
      'premium-button',
      'premium-button--success',
    );
  });

  it('supports additive card presentation variants', () => {
    render(<PremiumCard variant="glass" interactive glow>Wallet</PremiumCard>);
    expect(screen.getByText('Wallet')).toHaveClass(
      'premium-card--glass',
      'premium-card--interactive',
      'premium-card--glow',
    );
  });

  it('exposes accessible tab state and change events', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SegmentedControl
        value="leagues"
        label="Competition type"
        options={[
          { value: 'leagues', label: 'Leagues' },
          { value: 'cups', label: 'Cups' },
        ]}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Leagues' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Cups' }));
    expect(onChange).toHaveBeenCalledWith('cups');
  });

  it('maps semantic tones to token classes', () => {
    render(<ColorToken tone="green">Verified</ColorToken>);
    expect(screen.getByText('Verified')).toHaveClass('color-token--green');
  });
});
