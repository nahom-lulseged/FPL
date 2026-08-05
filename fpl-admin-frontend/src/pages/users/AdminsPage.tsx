import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCog } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Badge } from '@/components/common/Badge';
import { useUsersList } from '@/hooks/useUsers';
import { formatDate } from '@/lib/formatters';
import type { AdminUserListRow } from '@/types/adminUser';

export function AdminsPage() {
  const navigate = useNavigate(); const [page,setPage] = useState(1); const { data,isLoading } = useUsersList({ page, limit: 20, isAdmin: true, sortBy: 'createdAt', sortDir: 'desc' });
  return <div className="page-stack"><PageHeader eyebrow="People" title="Administrators" description="Review privileged accounts. New administrators are promoted from the Users module."/><div className="glass-card trust-banner"><ShieldCheck/><div><h2>Protected access</h2><p>Role changes remain governed by the existing promotion endpoint and audit trail.</p></div></div><DataTable<AdminUserListRow> columns={[{key:'displayName',label:'Administrator',render:(r)=><div className="identity-cell"><span className="avatar-ring"><UserCog/></span><div><strong>{r.displayName}</strong><small>{r.email}</small></div></div>},{key:'createdAt',label:'Joined',render:(r)=>formatDate(r.createdAt)},{key:'teamCount',label:'Teams'},{key:'leagueMembershipCount',label:'Leagues'},{key:'isSuspended',label:'Status',render:(r)=><Badge variant={r.isSuspended?'danger':'success'}>{r.isSuspended?'Suspended':'Active'}</Badge>}] } data={data?.data ?? []} meta={data?.meta ?? {page:1,limit:20,total:0,totalPages:1}} onPageChange={setPage} getRowId={(r)=>r.id} onRowClick={(r)=>navigate(`/users/${r.id}`)} isLoading={isLoading}/></div>;
}
