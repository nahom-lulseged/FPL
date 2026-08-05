import { useMemo, useState } from 'react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { JsonDiffViewer } from '@/components/diff/JsonDiffViewer';
import { DataTable } from '@/components/tables/DataTable';
import { useAdminGameweeks, useAdminPlayers } from '@/hooks/useContentAdmin';
import {
  useCommitCorrection,
  useCommitRecalculate,
  usePreviewCorrection,
  usePreviewRecalculate,
  useStatTypes,
} from '@/hooks/useScoring';
import { useToast } from '@/store/toastStore';
import { getErrorMessage } from '@/types/api';
import type {
  CorrectionPreviewResponse,
  RecalculatePreviewResponse,
  TeamScoreDiff,
} from '@/types/scoring';

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return <Badge variant="default">0</Badge>;
  }
  if (delta > 0) {
    return <Badge variant="success">+{delta}</Badge>;
  }
  return <Badge variant="danger">{delta}</Badge>;
}

const diffColumns = [
  { key: 'teamName', label: 'Team' },
  { key: 'oldPoints', label: 'Old' },
  { key: 'newPoints', label: 'New' },
  {
    key: 'delta',
    label: 'Delta',
    render: (row: TeamScoreDiff) => <DeltaBadge delta={row.delta} />,
  },
];

function DiffTable({ diffs }: { diffs: TeamScoreDiff[] }) {
  return (
    <DataTable
      columns={diffColumns}
      data={diffs}
      meta={{ page: 1, limit: diffs.length, total: diffs.length, totalPages: 1 }}
      onPageChange={() => {}}
      getRowId={(row) => row.teamId}
      emptyMessage="No team score changes"
    />
  );
}

export function PointsCorrectionPage() {
  const toast = useToast();

  const [recalcGameweekId, setRecalcGameweekId] = useState('');
  const [recalcReason, setRecalcReason] = useState('');
  const [recalcPreview, setRecalcPreview] = useState<RecalculatePreviewResponse | null>(null);

  const [corrGameweekId, setCorrGameweekId] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [statType, setStatType] = useState('');
  const [newValue, setNewValue] = useState('');
  const [corrReason, setCorrReason] = useState('');
  const [corrPreview, setCorrPreview] = useState<CorrectionPreviewResponse | null>(null);

  const { data: gameweeksData } = useAdminGameweeks({ page: 1, limit: 100 });
  const { data: playersData } = useAdminPlayers({
    page: 1,
    limit: 20,
    search: playerSearch || undefined,
  });
  const { data: statTypes } = useStatTypes();

  const previewRecalc = usePreviewRecalculate();
  const commitRecalc = useCommitRecalculate();
  const previewCorr = usePreviewCorrection();
  const commitCorr = useCommitCorrection();

  const gameweeks = gameweeksData?.data ?? [];
  const players = playersData?.data ?? [];

  const selectedStatType = useMemo(
    () => statTypes?.find((s) => s.value === statType),
    [statTypes, statType],
  );

  const parsedNewValue = useMemo(() => {
    if (selectedStatType?.inputType === 'boolean') {
      return newValue === 'true';
    }
    const num = Number(newValue);
    return Number.isFinite(num) ? num : null;
  }, [newValue, selectedStatType]);

  const handleRecalcPreview = () => {
    if (!recalcGameweekId) return;
    setRecalcPreview(null);
    previewRecalc.mutate(recalcGameweekId, {
      onSuccess: (result) => {
        setRecalcPreview(result);
        toast.success('Recalculation preview ready — review before committing');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to preview recalculation'));
      },
    });
  };

  const handleRecalcCommit = () => {
    if (!recalcPreview || !recalcReason.trim()) return;
    commitRecalc.mutate(
      {
        gameweekId: recalcGameweekId,
        previewToken: recalcPreview.previewToken,
        reason: recalcReason.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Gameweek scores recalculated');
          setRecalcPreview(null);
          setRecalcReason('');
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to commit recalculation'));
        },
      },
    );
  };

  const handleCorrPreview = () => {
    if (!corrGameweekId || !playerId || !statType || parsedNewValue === null) return;
    setCorrPreview(null);
    previewCorr.mutate(
      {
        playerId,
        gameweekId: corrGameweekId,
        statType,
        newValue: parsedNewValue,
      },
      {
        onSuccess: (result) => {
          setCorrPreview(result);
          toast.success('Correction preview ready — review before committing');
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to preview correction'));
        },
      },
    );
  };

  const handleCorrCommit = () => {
    if (!corrPreview || !corrReason.trim()) return;
    commitCorr.mutate(
      {
        previewToken: corrPreview.previewToken,
        reason: corrReason.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Points correction committed');
          setCorrPreview(null);
          setCorrReason('');
          setNewValue('');
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to commit correction'));
        },
      },
    );
  };

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-fpl-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-fpl-gray-900">Gameweek recalculation</h2>
        <p className="mt-1 text-sm text-fpl-gray-500">
          Re-run the scoring engine for all teams in a gameweek. Preview is required before
          commit.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-fpl-gray-700">Gameweek</span>
            <select
              className="w-full rounded-md border border-fpl-gray-200 px-3 py-2 text-sm"
              value={recalcGameweekId}
              onChange={(e) => {
                setRecalcGameweekId(e.target.value);
                setRecalcPreview(null);
              }}
            >
              <option value="">Select gameweek</option>
              {gameweeks.map((gw) => (
                <option key={gw.id} value={gw.id}>
                  GW{gw.number} ({gw.status})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-fpl-gray-700">Reason</span>
            <textarea
              className="w-full rounded-md border border-fpl-gray-200 px-3 py-2 text-sm"
              rows={2}
              value={recalcReason}
              onChange={(e) => setRecalcReason(e.target.value)}
              placeholder="Why is this recalculation needed?"
            />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={handleRecalcPreview}
            isLoading={previewRecalc.isPending}
            disabled={!recalcGameweekId}
          >
            Preview
          </Button>
          {recalcPreview ? (
            <Button
              variant="danger"
              onClick={handleRecalcCommit}
              isLoading={commitRecalc.isPending}
              disabled={!recalcReason.trim()}
            >
              Commit recalculation
            </Button>
          ) : null}
        </div>

        {recalcPreview ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-fpl-gray-600">
              {recalcPreview.summary.teamsChanged} of {recalcPreview.summary.teamsTotal} teams
              changed (net delta: {recalcPreview.summary.totalDelta})
            </p>
            <DiffTable diffs={recalcPreview.diffs} />
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-fpl-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-fpl-gray-900">Single-player correction</h2>
        <p className="mt-1 text-sm text-fpl-gray-500">
          Adjust a player stat and cascade the change to every team that owns them.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-fpl-gray-700">Gameweek</span>
            <select
              className="w-full rounded-md border border-fpl-gray-200 px-3 py-2 text-sm"
              value={corrGameweekId}
              onChange={(e) => {
                setCorrGameweekId(e.target.value);
                setCorrPreview(null);
              }}
            >
              <option value="">Select gameweek</option>
              {gameweeks.map((gw) => (
                <option key={gw.id} value={gw.id}>
                  GW{gw.number}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-fpl-gray-700">Search player</span>
            <Input
              label="Search"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              placeholder="Player name"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-fpl-gray-700">Player</span>
            <select
              className="w-full rounded-md border border-fpl-gray-200 px-3 py-2 text-sm"
              value={playerId}
              onChange={(e) => {
                setPlayerId(e.target.value);
                setCorrPreview(null);
              }}
            >
              <option value="">Select player</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.position})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-fpl-gray-700">Stat</span>
            <select
              className="w-full rounded-md border border-fpl-gray-200 px-3 py-2 text-sm"
              value={statType}
              onChange={(e) => {
                setStatType(e.target.value);
                setNewValue('');
                setCorrPreview(null);
              }}
            >
              <option value="">Select stat</option>
              {(statTypes ?? []).map((s) => (
                <option key={s.value} value={s.value}>
                  {s.value}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-fpl-gray-700">New value</span>
            {selectedStatType?.inputType === 'boolean' ? (
              <select
                className="w-full rounded-md border border-fpl-gray-200 px-3 py-2 text-sm"
                value={newValue}
                onChange={(e) => {
                  setNewValue(e.target.value);
                  setCorrPreview(null);
                }}
              >
                <option value="">Select</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <Input
                label="Value"
                type="number"
                min={0}
                value={newValue}
                onChange={(e) => {
                  setNewValue(e.target.value);
                  setCorrPreview(null);
                }}
              />
            )}
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-fpl-gray-700">Reason</span>
            <textarea
              className="w-full rounded-md border border-fpl-gray-200 px-3 py-2 text-sm"
              rows={2}
              value={corrReason}
              onChange={(e) => setCorrReason(e.target.value)}
              placeholder="Why is this correction needed?"
            />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={handleCorrPreview}
            isLoading={previewCorr.isPending}
            disabled={
              !corrGameweekId || !playerId || !statType || parsedNewValue === null
            }
          >
            Preview
          </Button>
          {corrPreview ? (
            <Button
              variant="danger"
              onClick={handleCorrCommit}
              isLoading={commitCorr.isPending}
              disabled={!corrReason.trim()}
            >
              Commit correction
            </Button>
          ) : null}
        </div>

        {corrPreview ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-fpl-gray-600">
              {corrPreview.player.name}: {corrPreview.correction.oldPlayerPoints} →{' '}
              {corrPreview.correction.newPlayerPoints} pts
            </p>
            <JsonDiffViewer
              title="Player stat changes"
              before={corrPreview.correction.beforeStats}
              after={corrPreview.correction.afterStats}
            />
            <DiffTable diffs={corrPreview.diffs} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
