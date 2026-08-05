import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ChipCardsSkeleton,
  PitchSkeleton,
  PlayerListSkeleton,
  Skeleton,
  StatCardsSkeleton,
  TableSkeleton,
  TeamPageSkeleton,
} from '@/components/common/Skeleton';

const skeletonCases = [
  ['base skeleton', <Skeleton key="base" />],
  ['player list skeleton', <PlayerListSkeleton key="players" />],
  ['pitch skeleton', <PitchSkeleton key="pitch" />],
  ['stat cards skeleton', <StatCardsSkeleton key="stats" />],
  ['table skeleton', <TableSkeleton key="table" rows={3} cols={2} />],
  ['team page skeleton', <TeamPageSkeleton key="team" />],
  ['chip cards skeleton', <ChipCardsSkeleton key="chips" />],
] as const;

describe('Skeleton loaders', () => {
  it.each(skeletonCases)('renders the branded loader for %s', (_label, element) => {
    const { unmount } = render(element);

    const status = screen.getByRole('status', { name: /loading fantasy ethiopia/i });
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Fantasy Ethiopia')).toBeInTheDocument();
    expect(status.querySelector('img')).toHaveAttribute('src', '/brand/fpl-team-logo.png');

    unmount();
  });
});
