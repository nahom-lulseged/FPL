import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/common/Input';
import { AuditLogTable } from '@/components/audit/AuditLogTable';
import { useAuditLogList } from '@/hooks/useAuditLog';
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from '@/types/auditLog';

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [adminId, setAdminId] = useState('');
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useAuditLogList({
    page,
    limit: 20,
    ...(adminId.trim() ? { adminId: adminId.trim() } : {}),
    ...(action ? { action: action as (typeof AUDIT_ACTIONS)[number] } : {}),
    ...(targetType ? { targetType: targetType as (typeof AUDIT_TARGET_TYPES)[number] } : {}),
    ...(from ? { from: new Date(from).toISOString() } : {}),
    ...(to ? { to: new Date(`${to}T23:59:59.999`).toISOString() } : {}),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 };

  const filters = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Input
        label="Admin ID"
        name="adminId"
        value={adminId}
        onChange={(event) => {
          setAdminId(event.target.value);
          setPage(1);
        }}
        placeholder="Filter by admin user id"
      />
      <div>
        <label htmlFor="action" className="mb-1 block text-sm font-medium text-fpl-gray-700">
          Action
        </label>
        <select
          id="action"
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
          className="w-full rounded-md border border-fpl-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="targetType" className="mb-1 block text-sm font-medium text-fpl-gray-700">
          Target type
        </label>
        <select
          id="targetType"
          value={targetType}
          onChange={(event) => {
            setTargetType(event.target.value);
            setPage(1);
          }}
          className="w-full rounded-md border border-fpl-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          {AUDIT_TARGET_TYPES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <Input
        label="From"
        name="from"
        type="date"
        value={from}
        onChange={(event) => {
          setFrom(event.target.value);
          setPage(1);
        }}
      />
      <Input
        label="To"
        name="to"
        type="date"
        value={to}
        onChange={(event) => {
          setTo(event.target.value);
          setPage(1);
        }}
      />
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-fpl-gray-900">Audit Log</h2>
          <p className="mt-1 text-sm text-fpl-gray-500">
            Immutable record of mutating admin actions
          </p>
        </div>
        <Link
          to="/dashboard"
          className="text-sm font-medium text-fpl-purple hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
      <AuditLogTable
        data={rows}
        meta={meta}
        page={page}
        onPageChange={setPage}
        filters={filters}
        isLoading={isLoading}
      />
    </div>
  );
}
