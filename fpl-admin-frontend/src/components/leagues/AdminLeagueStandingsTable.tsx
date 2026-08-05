import { Badge } from '@/components/common/Badge';
import { DataTable } from '@/components/tables/DataTable';
import type { ClassicStandingRow } from '@/types/league';

const CHIP_LABELS: Record<string, string> = {
  BENCH_BOOST: 'BB',
  TRIPLE_CAPTAIN: 'TC',
  FREE_HIT: 'FH',
  WILDCARD: 'WC',
};

function formatChipLabel(chipType: string): string {
  return CHIP_LABELS[chipType] ?? chipType;
}

interface AdminLeagueStandingsTableProps {
  standings: ClassicStandingRow[];
  currentGameweek: number | null;
  isLoading?: boolean;
}

export function AdminLeagueStandingsTable({
  standings,
  currentGameweek,
  isLoading = false,
}: AdminLeagueStandingsTableProps) {
  const gwLabel = currentGameweek !== null ? `GW ${currentGameweek}` : 'GW';

  return (
    <DataTable<ClassicStandingRow>
      columns={[
        {
          key: 'rank',
          label: 'Rank',
          render: (row) => row.rank,
        },
        {
          key: 'managerName',
          label: 'Manager',
          render: (row) => row.managerName,
        },
        {
          key: 'teamName',
          label: 'Team',
          render: (row) => row.teamName,
        },
        {
          key: 'gameweekPoints',
          label: gwLabel,
          render: (row) => (row.gameweekPoints !== null ? row.gameweekPoints : '—'),
        },
        {
          key: 'totalPoints',
          label: 'Total',
          render: (row) => row.totalPoints,
        },
        {
          key: 'chipsUsed',
          label: 'Chips',
          render: (row) =>
            row.chipsUsed.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {row.chipsUsed.map((chip) => (
                  <Badge key={`${chip.chipType}-${chip.gameweekNumber}`} variant="default">
                    {formatChipLabel(chip.chipType)} GW{chip.gameweekNumber}
                  </Badge>
                ))}
              </div>
            ) : (
              '—'
            ),
        },
      ]}
      data={standings}
      meta={{
        page: 1,
        limit: standings.length || 1,
        total: standings.length,
        totalPages: 1,
      }}
      onPageChange={() => {}}
      isLoading={isLoading}
      emptyMessage="No standings data"
      getRowId={(row) => row.teamId}
    />
  );
}
