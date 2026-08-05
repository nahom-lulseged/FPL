import { Badge } from '@/components/common/Badge';

interface ReconciliationStatusBadgeProps {
  matches: boolean;
}

export function ReconciliationStatusBadge({ matches }: ReconciliationStatusBadgeProps) {
  return (
    <Badge variant={matches ? 'success' : 'danger'}>
      {matches ? 'Reconciled' : 'Mismatch'}
    </Badge>
  );
}
