import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/common/Badge';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { FullPageSpinner } from '@/components/common/Spinner';
import { InviteCodePanel } from '@/components/league/InviteCodePanel';
import { PayoutStructureBadge } from '@/components/leagues/PayoutStructureBadge';
import { StandingsTable } from '@/components/league/StandingsTable';
import { formatMinor } from '@/lib/money';
import { useLeague } from '@/hooks/useLeague';
import { useLeagueStandings } from '@/hooks/useLeagueStandings';
import { useLiveLeagueStandings } from '@/hooks/useLiveLeagueStandings';
import { getErrorMessage } from '@/types/api';

const NOT_A_MEMBER_MESSAGE = 'You are not a member of this league';

export function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const leagueQuery = useLeague(id);
  const standingsQuery = useLeagueStandings(id);
  useLiveLeagueStandings(id);

  if (leagueQuery.isLoading) {
    return <FullPageSpinner />;
  }

  if (leagueQuery.isError) {
    const errorMessage = getErrorMessage(leagueQuery.error, 'Failed to load league');
    const isNotMember = errorMessage === NOT_A_MEMBER_MESSAGE;

    return (
      <div className="space-y-4">
        <QueryErrorState
          error={leagueQuery.error}
          message="Failed to load league"
          onRetry={isNotMember ? undefined : () => void leagueQuery.refetch()}
        />
        {isNotMember ? (
          <p className="text-center text-sm text-white/60">
            Join from Browse staked or with an invite code on the leagues page.
          </p>
        ) : null}
        <div className="text-center">
          <Link to="/leagues" className="text-fpl-green underline">
            Back to leagues
          </Link>
        </div>
      </div>
    );
  }

  const league = leagueQuery.data!;
  const isStaked = league.isStaked || (league.stakeAmountMinor != null && league.stakeAmountMinor > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link to="/leagues" className="text-sm text-fpl-green hover:underline">
          ← Back to leagues
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{league.name}</h1>
            <p className="mt-1 text-sm text-white/60">
              {league.memberCount} {league.memberCount === 1 ? 'member' : 'members'} ·{' '}
              {league.season}
            </p>
            {isStaked ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm text-fpl-gold">
                  Pot {formatMinor(league.potTotalMinor ?? 0)} · Stake {formatMinor(league.stakeAmountMinor!)}
                </span>
                <Badge variant="warning">{league.payoutStatus ?? 'OPEN'}</Badge>
              </div>
            ) : null}
            {league.payoutSplitConfig ? (
              <div className="mt-2">
                <PayoutStructureBadge config={league.payoutSplitConfig} />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {isStaked ? <Badge variant="warning">Staked</Badge> : <Badge variant="position">Classic</Badge>}
            {league.isAdmin ? <Badge variant="warning">Admin</Badge> : null}
          </div>
        </div>
      </div>

      {league.inviteCode ? <InviteCodePanel inviteCode={league.inviteCode} /> : null}

      <section className="rounded-lg border border-white/10 bg-fpl-purple/40 p-4">
        <h2 className="text-lg font-semibold text-white">Standings</h2>
        {standingsQuery.isError ? (
          <QueryErrorState
            error={standingsQuery.error}
            message="Failed to load standings"
            onRetry={() => void standingsQuery.refetch()}
          />
        ) : (
          <div className="mt-4">
            <StandingsTable
              standings={standingsQuery.data?.data ?? []}
              currentGameweek={standingsQuery.data?.currentGameweek ?? null}
              isLoading={standingsQuery.isLoading}
            />
          </div>
        )}
      </section>
    </div>
  );
}
