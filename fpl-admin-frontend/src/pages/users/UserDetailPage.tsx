import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import {
  useDeleteUser,
  usePromoteUser,
  useResetUserPassword,
  useSuspendUser,
  useUserDetail,
} from '@/hooks/useUsers';
import { formatDate } from '@/lib/formatters';
import { useToast } from '@/store/toastStore';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: user, isLoading, isError } = useUserDetail(id);
  const suspendMutation = useSuspendUser();
  const promoteMutation = usePromoteUser();
  const resetPasswordMutation = useResetUserPassword();
  const deleteMutation = useDeleteUser();

  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div>
        <p className="text-sm text-fpl-pink">User not found.</p>
        <Link to="/users" className="mt-2 inline-block text-sm text-fpl-purple hover:underline">
          Back to users
        </Link>
      </div>
    );
  }

  const handleSuspend = async () => {
    try {
      await suspendMutation.mutateAsync({
        id: user.id,
        suspended: true,
        reason: suspendReason.trim() || undefined,
      });
      toast.success('User suspended');
      setSuspendModalOpen(false);
      setSuspendReason('');
    } catch {
      toast.error('Failed to suspend user');
    }
  };

  const handleUnsuspend = async () => {
    try {
      await suspendMutation.mutateAsync({ id: user.id, suspended: false });
      toast.success('User unsuspended');
    } catch {
      toast.error('Failed to unsuspend user');
    }
  };

  const handlePromote = async () => {
    try {
      await promoteMutation.mutateAsync(user.id);
      toast.success(user.isAdmin ? 'Admin demoted' : 'User promoted to admin');
      setPromoteDialogOpen(false);
    } catch {
      toast.error('Failed to update admin role');
    }
  };

  const handleResetPassword = async () => {
    try {
      await resetPasswordMutation.mutateAsync(user.id);
      toast.success('Password reset token generated (check server logs)');
      setResetDialogOpen(false);
    } catch {
      toast.error('Failed to generate reset token');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(user.id);
      toast.success('User deleted');
      navigate('/users');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/users" className="text-sm text-fpl-purple hover:underline">
          ← Back to users
        </Link>
        <h1 className="mt-2 text-xl font-bold text-fpl-gray-900">{user.displayName}</h1>
        <p className="text-sm text-fpl-gray-500">{user.email}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-fpl-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fpl-gray-500">
            Profile
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-fpl-gray-500">Registered</dt>
              <dd className="text-fpl-gray-900">{formatDate(user.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fpl-gray-500">Role</dt>
              <dd>
                {user.isAdmin ? <Badge variant="warning">Admin</Badge> : <Badge>User</Badge>}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fpl-gray-500">Status</dt>
              <dd>
                {user.isSuspended ? (
                  <Badge variant="danger">Suspended</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </dd>
            </div>
            {user.isSuspended && user.suspendedReason ? (
              <div>
                <dt className="text-fpl-gray-500">Suspend reason</dt>
                <dd className="mt-1 text-fpl-gray-900">{user.suspendedReason}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-fpl-gray-500">Transfer count</dt>
              <dd className="text-fpl-gray-900">{user.transferCount}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-fpl-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fpl-gray-500">
            Actions
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.isSuspended ? (
              <Button
                variant="secondary"
                onClick={() => void handleUnsuspend()}
                isLoading={suspendMutation.isPending}
              >
                Unsuspend
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setSuspendModalOpen(true)}>
                Suspend
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                if (user.isAdmin) {
                  void handlePromote();
                } else {
                  setPromoteDialogOpen(true);
                }
              }}
              isLoading={promoteMutation.isPending}
            >
              {user.isAdmin ? 'Demote Admin' : 'Promote to Admin'}
            </Button>
            <Button variant="secondary" onClick={() => setResetDialogOpen(true)}>
              Reset Password
            </Button>
            <Button variant="danger" onClick={() => setDeleteDialogOpen(true)}>
              Delete Account
            </Button>
          </div>
        </section>
      </div>

      {user.teams.map((team) => (
        <section
          key={team.id}
          className="rounded-lg border border-fpl-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-fpl-gray-900">{team.name}</h2>
              <p className="text-sm text-fpl-gray-500">
                {team.season} · {team.totalPoints} pts · {team.transferCount} transfers
              </p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-fpl-gray-500">
              Squad preview
            </h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {team.squad
                .filter((entry) => entry.isStarter)
                .map((entry) => (
                  <li
                    key={`${team.id}-${entry.player.id}`}
                    className="rounded border border-fpl-gray-100 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-fpl-gray-900">{entry.player.name}</span>
                    <span className="ml-2 text-fpl-gray-500">{entry.player.position}</span>
                    {entry.isCaptain ? (
                      <Badge className="ml-2" variant="warning">
                        C
                      </Badge>
                    ) : null}
                    {entry.isViceCaptain ? (
                      <Badge className="ml-2" variant="default">
                        VC
                      </Badge>
                    ) : null}
                  </li>
                ))}
            </ul>
          </div>
        </section>
      ))}

      <section className="rounded-lg border border-fpl-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fpl-gray-500">
          League memberships
        </h2>
        {user.leagueMemberships.length === 0 ? (
          <p className="mt-3 text-sm text-fpl-gray-500">No league memberships.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-fpl-gray-200 text-fpl-gray-500">
                <tr>
                  <th className="px-2 py-2 font-medium">League</th>
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 font-medium">Season</th>
                  <th className="px-2 py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {user.leagueMemberships.map((membership) => (
                  <tr key={membership.id} className="border-b border-fpl-gray-100">
                    <td className="px-2 py-2 text-fpl-gray-900">{membership.league.name}</td>
                    <td className="px-2 py-2 text-fpl-gray-900">{membership.league.type}</td>
                    <td className="px-2 py-2 text-fpl-gray-900">{membership.league.season}</td>
                    <td className="px-2 py-2 text-fpl-gray-900">
                      {formatDate(membership.joinedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={suspendModalOpen}
        onClose={() => setSuspendModalOpen(false)}
        title="Suspend user"
      >
        <p className="text-sm text-fpl-gray-600">
          The user will be blocked from logging in and refreshing their session.
        </p>
        <div className="mt-4">
          <Input
            label="Reason (optional)"
            value={suspendReason}
            onChange={(event) => setSuspendReason(event.target.value)}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setSuspendModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => void handleSuspend()}
            isLoading={suspendMutation.isPending}
          >
            Suspend
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={promoteDialogOpen}
        title="Promote to admin"
        description={`Promoting ${user.email} grants full admin access. Type their email to confirm.`}
        confirmLabel="Promote to Admin"
        confirmVariant="primary"
        requiredText={user.email}
        confirmInputLabel={`Type "${user.email}" to confirm`}
        onConfirm={() => void handlePromote()}
        onCancel={() => setPromoteDialogOpen(false)}
        isLoading={promoteMutation.isPending}
      />

      <ConfirmDialog
        open={resetDialogOpen}
        title="Reset password"
        description="A reset token will be generated and written to the server logs. The user's current password will remain until they use the token."
        confirmLabel="Generate reset token"
        confirmVariant="secondary"
        onConfirm={() => void handleResetPassword()}
        onCancel={() => setResetDialogOpen(false)}
        isLoading={resetPasswordMutation.isPending}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete account"
        description={`This permanently deletes ${user.email} and all related teams, squads, transfers, and league memberships. Type their email to confirm.`}
        confirmLabel="Delete account"
        requiredText={user.email}
        confirmInputLabel={`Type "${user.email}" to confirm`}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteDialogOpen(false)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
