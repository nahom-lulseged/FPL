import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Spinner } from '@/components/common/Spinner';
import { AdminLeagueStandingsTable } from '@/components/leagues/AdminLeagueStandingsTable';
import { DataTable } from '@/components/tables/DataTable';
import {
  useDissolveLeague,
  useLeagueDetail,
  useRemoveLeagueMember,
} from '@/hooks/useLeaguesAdmin';
import { formatDate } from '@/lib/formatters';
import { useToast } from '@/store/toastStore';
import type { AdminLeagueMember, LeagueType } from '@/types/league';

function formatLeagueType(type: LeagueType): string {
  return type === 'HEAD_TO_HEAD' ? 'Head to Head' : 'Classic';
}

export function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: league, isLoading, isError } = useLeagueDetail(id);
  const removeMemberMutation = useRemoveLeagueMember();
  const dissolveMutation = useDissolveLeague();

  const [memberToRemove, setMemberToRemove] = useState<AdminLeagueMember | null>(null);
  const [dissolveDialogOpen, setDissolveDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (isError || !league) {
    return (
      <div>
        <p className="text-sm text-fpl-pink">League not found.</p>
        <Link to="/leagues" className="mt-2 inline-block text-sm text-fpl-purple hover:underline">
          Back to leagues
        </Link>
      </div>
    );
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      await removeMemberMutation.mutateAsync({
        leagueId: league.id,
        userId: memberToRemove.userId,
      });
      toast.success(`Removed ${memberToRemove.email} from league`);
      setMemberToRemove(null);
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleDissolve = async () => {
    try {
      await dissolveMutation.mutateAsync(league.id);
      toast.success('League dissolved');
      navigate('/leagues');
    } catch {
      toast.error('Failed to dissolve league');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/leagues" className="text-sm text-fpl-purple hover:underline">
          ← Back to leagues
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-fpl-gray-900">{league.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-fpl-gray-500">
              <Badge variant={league.type === 'CLASSIC' ? 'default' : 'warning'}>
                {formatLeagueType(league.type)}
              </Badge>
              <span>{league.season}</span>
              <span>·</span>
              <span>Code: {league.inviteCode}</span>
              <span>·</span>
              <span>{league.memberCount} members</span>
              <span>·</span>
              <span>Created {formatDate(league.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-fpl-gray-500">
              Creator:{' '}
              <Link
                to={`/users/${league.creator.id}`}
                className="text-fpl-purple hover:underline"
              >
                {league.creator.displayName} ({league.creator.email})
              </Link>
            </p>
          </div>
          <Button variant="danger" onClick={() => setDissolveDialogOpen(true)}>
            Dissolve League
          </Button>
        </div>
      </div>

      <section className="rounded-lg border border-fpl-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fpl-gray-500">
          Standings
        </h2>
        <div className="mt-4">
          <AdminLeagueStandingsTable
            standings={league.standings}
            currentGameweek={league.currentGameweek}
          />
        </div>
      </section>

      <section className="rounded-lg border border-fpl-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fpl-gray-500">
          Members
        </h2>
        <div className="mt-4">
          <DataTable<AdminLeagueMember>
            columns={[
              {
                key: 'email',
                label: 'Email',
                render: (row) => (
                  <Link to={`/users/${row.userId}`} className="text-fpl-purple hover:underline">
                    {row.email}
                  </Link>
                ),
              },
              {
                key: 'displayName',
                label: 'Name',
                render: (row) => row.displayName,
              },
              {
                key: 'teamName',
                label: 'Team',
                render: (row) => row.teamName,
              },
              {
                key: 'joinedAt',
                label: 'Joined',
                render: (row) => formatDate(row.joinedAt),
              },
              {
                key: 'actions',
                label: '',
                render: (row) => (
                  <Button
                    variant="danger"
                    className="px-2 py-1 text-xs"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMemberToRemove(row);
                    }}
                  >
                    Remove
                  </Button>
                ),
              },
            ]}
            data={league.members}
            meta={{
              page: 1,
              limit: league.members.length || 1,
              total: league.members.length,
              totalPages: 1,
            }}
            onPageChange={() => {}}
            emptyMessage="No members"
            getRowId={(row) => row.id}
          />
        </div>
      </section>

      <ConfirmDialog
        open={memberToRemove !== null}
        title="Remove member"
        description={
          memberToRemove
            ? `Remove ${memberToRemove.displayName} (${memberToRemove.email}) from this league?`
            : ''
        }
        confirmLabel="Remove"
        confirmVariant="danger"
        isLoading={removeMemberMutation.isPending}
        onConfirm={() => void handleRemoveMember()}
        onCancel={() => setMemberToRemove(null)}
      />

      <ConfirmDialog
        open={dissolveDialogOpen}
        title="Dissolve league"
        description={`This permanently deletes "${league.name}" and removes all memberships. This cannot be undone.`}
        confirmLabel="Dissolve"
        confirmVariant="danger"
        requiredText={league.name}
        isLoading={dissolveMutation.isPending}
        onConfirm={() => void handleDissolve()}
        onCancel={() => setDissolveDialogOpen(false)}
      />
    </div>
  );
}
