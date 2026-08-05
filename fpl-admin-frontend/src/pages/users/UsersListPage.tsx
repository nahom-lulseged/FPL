import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { DataTable } from '@/components/tables/DataTable';
import { CsvExportButton } from '@/components/tables/CsvExportButton';
import { useUsersList } from '@/hooks/useUsers';
import { formatDate } from '@/lib/formatters';
import type { AdminUserListRow } from '@/types/adminUser';

export function UsersListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [registeredFrom, setRegisteredFrom] = useState('');
  const [registeredTo, setRegisteredTo] = useState('');
  const [isAdminFilter, setIsAdminFilter] = useState<'' | 'true' | 'false'>('');
  const [hasTeamFilter, setHasTeamFilter] = useState<'' | 'true' | 'false'>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'email' | 'displayName' | 'teamCount'>(
    'createdAt',
  );
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const { data, isLoading } = useUsersList({
    page,
    limit: 20,
    ...(search ? { search } : {}),
    ...(registeredFrom ? { registeredFrom } : {}),
    ...(registeredTo ? { registeredTo } : {}),
    ...(isAdminFilter !== '' ? { isAdmin: isAdminFilter === 'true' } : {}),
    ...(hasTeamFilter !== '' ? { hasTeam: hasTeamFilter === 'true' } : {}),
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
      setSortDir('asc');
    }
    setPage(1);
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-fpl-gray-900">Users</h1>
          <p className="mt-1 text-sm text-fpl-gray-500">
            Search, filter, and manage registered users
          </p>
        </div>
        <CsvExportButton entity="users" />
      </div>

      <DataTable<AdminUserListRow>
        columns={[
          {
            key: 'email',
            label: 'Email',
            sortable: true,
            render: (row) => row.email,
          },
          {
            key: 'displayName',
            label: 'Name',
            sortable: true,
            render: (row) => row.displayName,
          },
          {
            key: 'createdAt',
            label: 'Registered',
            sortable: true,
            render: (row) => formatDate(row.createdAt),
          },
          {
            key: 'teamCount',
            label: 'Teams',
            sortable: true,
            render: (row) => row.teamCount,
          },
          {
            key: 'isAdmin',
            label: 'Admin',
            render: (row) =>
              row.isAdmin ? <Badge variant="warning">Admin</Badge> : <span>—</span>,
          },
          {
            key: 'isSuspended',
            label: 'Status',
            render: (row) =>
              row.isSuspended ? (
                <Badge variant="danger">Suspended</Badge>
              ) : (
                <Badge variant="success">Active</Badge>
              ),
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
        onRowClick={(row) => navigate(`/users/${row.id}`)}
        filters={
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Input
              label="Search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Email or name"
            />
            <Input
              label="Registered from"
              type="date"
              value={registeredFrom}
              onChange={(event) => {
                setRegisteredFrom(event.target.value);
                setPage(1);
              }}
            />
            <Input
              label="Registered to"
              type="date"
              value={registeredTo}
              onChange={(event) => {
                setRegisteredTo(event.target.value);
                setPage(1);
              }}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="isAdminFilter" className="text-sm font-medium text-fpl-gray-900">
                Admin status
              </label>
              <select
                id="isAdminFilter"
                className="rounded-md border border-fpl-gray-200 bg-white px-3 py-2 text-sm text-fpl-gray-900"
                value={isAdminFilter}
                onChange={(event) => {
                  setIsAdminFilter(event.target.value as '' | 'true' | 'false');
                  setPage(1);
                }}
              >
                <option value="">All</option>
                <option value="true">Admins only</option>
                <option value="false">Non-admins</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="hasTeamFilter" className="text-sm font-medium text-fpl-gray-900">
                Team status
              </label>
              <select
                id="hasTeamFilter"
                className="rounded-md border border-fpl-gray-200 bg-white px-3 py-2 text-sm text-fpl-gray-900"
                value={hasTeamFilter}
                onChange={(event) => {
                  setHasTeamFilter(event.target.value as '' | 'true' | 'false');
                  setPage(1);
                }}
              >
                <option value="">All</option>
                <option value="true">Has team</option>
                <option value="false">No team</option>
              </select>
            </div>
          </div>
        }
      />
    </div>
  );
}
