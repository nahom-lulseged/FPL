import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { DataTable } from '@/components/tables/DataTable';
import { CsvExportButton } from '@/components/tables/CsvExportButton';
import { useLeaguesList } from '@/hooks/useLeaguesAdmin';
import { formatDate } from '@/lib/formatters';
import type { AdminLeagueListRow, LeagueType } from '@/types/league';

function formatLeagueType(type: LeagueType): string {
  return type === 'HEAD_TO_HEAD' ? 'H2H' : 'Classic';
}

export function LeaguesListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | LeagueType>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'memberCount' | 'name'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const { data, isLoading } = useLeaguesList({
    page,
    limit: 20,
    ...(search ? { search } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    sortBy,
    sortDir,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 };

  const handleSortChange = (key: string) => {
    const nextKey = key as typeof sortBy;
    if (sortBy === nextKey) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(nextKey);
      setSortDir(nextKey === 'name' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-fpl-gray-900">Leagues</h1>
          <p className="mt-1 text-sm text-fpl-gray-500">
            Search, filter, and moderate user-created leagues
          </p>
        </div>
        <CsvExportButton entity="leagues" />
      </div>

      <DataTable<AdminLeagueListRow>
        columns={[
          {
            key: 'name',
            label: 'Name',
            sortable: true,
            render: (row) => row.name,
          },
          {
            key: 'type',
            label: 'Type',
            render: (row) => (
              <Badge variant={row.type === 'CLASSIC' ? 'default' : 'warning'}>
                {formatLeagueType(row.type)}
              </Badge>
            ),
          },
          {
            key: 'memberCount',
            label: 'Members',
            sortable: true,
            render: (row) => row.memberCount,
          },
          {
            key: 'creator',
            label: 'Creator',
            render: (row) => row.creator.email,
          },
          {
            key: 'createdAt',
            label: 'Created',
            sortable: true,
            render: (row) => formatDate(row.createdAt),
          },
        ]}
        data={rows}
        meta={meta}
        onPageChange={setPage}
        sortKey={sortBy}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        isLoading={isLoading}
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/leagues/${row.id}`)}
        filters={
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="League name or creator email"
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="typeFilter" className="text-sm font-medium text-fpl-gray-900">
                League type
              </label>
              <select
                id="typeFilter"
                className="rounded-md border border-fpl-gray-200 bg-white px-3 py-2 text-sm text-fpl-gray-900"
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value as '' | LeagueType);
                  setPage(1);
                }}
              >
                <option value="">All types</option>
                <option value="CLASSIC">Classic</option>
                <option value="HEAD_TO_HEAD">Head to Head</option>
              </select>
            </div>
          </div>
        }
      />
    </div>
  );
}
