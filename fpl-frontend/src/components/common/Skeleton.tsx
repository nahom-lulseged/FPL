import { FullPageSpinner } from '@/components/common/Spinner';

interface SkeletonProps {
  className?: string;
}

export function Skeleton(_props: SkeletonProps) {
  return <FullPageSpinner />;
}

export function PlayerListSkeleton() {
  return <FullPageSpinner />;
}

export function PitchSkeleton() {
  return <FullPageSpinner />;
}

export function StatCardsSkeleton() {
  return <FullPageSpinner />;
}

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton(_props: TableSkeletonProps) {
  return <FullPageSpinner />;
}

interface TeamPageSkeletonProps {
  showSidebar?: boolean;
}

export function TeamPageSkeleton(_props: TeamPageSkeletonProps) {
  return <FullPageSpinner />;
}

export function ChipCardsSkeleton() {
  return <FullPageSpinner />;
}
