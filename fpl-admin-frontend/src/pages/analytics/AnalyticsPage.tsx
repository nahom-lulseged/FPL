import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/common/Button';
import { FullPageSpinner } from '@/components/common/Spinner';
import { Input } from '@/components/common/Input';
import { useAdminGameweeks } from '@/hooks/useContentAdmin';
import { useChipUsage, useGrowthMetrics, useTransferTrends } from '@/hooks/useAnalytics';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { getErrorMessage } from '@/types/api';
import type { ChipType } from '@/types/analytics';

const CHIP_LABELS: Record<ChipType, string> = {
  WILDCARD: 'Wildcard',
  FREE_HIT: 'Free Hit',
  BENCH_BOOST: 'Bench Boost',
  TRIPLE_CAPTAIN: 'Triple Captain',
};

const CHIP_COLORS: Record<ChipType, string> = {
  WILDCARD: '#37003c',
  FREE_HIT: '#00ff87',
  BENCH_BOOST: '#e90052',
  TRIPLE_CAPTAIN: '#ff2882',
};

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultGrowthRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

function formatPeriodLabel(period: string, granularity: 'day' | 'week'): string {
  const date = new Date(period);
  if (granularity === 'week') {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ChartCard({
  title,
  description,
  children,
  controls,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  controls?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-fpl-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-fpl-gray-900">{title}</h2>
          {description ? <p className="mt-1 text-xs text-fpl-gray-500">{description}</p> : null}
        </div>
        {controls}
      </div>
      {children}
    </section>
  );
}

function EmptyChartMessage({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-fpl-gray-500">{message}</div>
  );
}

export function AnalyticsPage() {
  const defaultRange = useMemo(() => defaultGrowthRange(), []);
  const { data: summary } = useDashboardSummary();
  const { data: gameweeksData } = useAdminGameweeks({ page: 1, limit: 100 });

  const [selectedGameweek, setSelectedGameweek] = useState<number | undefined>(undefined);
  const [growthFrom, setGrowthFrom] = useState(defaultRange.from);
  const [growthTo, setGrowthTo] = useState(defaultRange.to);
  const [growthGranularity, setGrowthGranularity] = useState<'day' | 'week'>('day');

  useEffect(() => {
    if (selectedGameweek === undefined && summary?.currentGameweek) {
      setSelectedGameweek(summary.currentGameweek.number);
    }
  }, [summary?.currentGameweek, selectedGameweek]);

  const transfersQuery = useTransferTrends(selectedGameweek);
  const chipsQuery = useChipUsage();
  const growthQuery = useGrowthMetrics({
    from: growthFrom,
    to: growthTo,
    granularity: growthGranularity,
  });

  const gameweeks = gameweeksData?.data ?? [];

  const chipPieData = useMemo(() => {
    if (!chipsQuery.data) return [];
    return (Object.entries(chipsQuery.data.byType) as Array<[ChipType, number]>)
      .filter(([, count]) => count > 0)
      .map(([chipType, count]) => ({
        name: CHIP_LABELS[chipType],
        value: count,
        chipType,
      }));
  }, [chipsQuery.data]);

  const chipByGameweekData = useMemo(() => {
    if (!chipsQuery.data) return [];

    const grouped = new Map<number, Record<string, number>>();
    for (const row of chipsQuery.data.byGameweek) {
      const existing = grouped.get(row.gameweekNumber) ?? {};
      existing[row.chipType] = row.count;
      grouped.set(row.gameweekNumber, existing);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a - b)
      .map(([gameweekNumber, counts]) => ({
        gameweek: `GW ${gameweekNumber}`,
        WILDCARD: counts.WILDCARD ?? 0,
        FREE_HIT: counts.FREE_HIT ?? 0,
        BENCH_BOOST: counts.BENCH_BOOST ?? 0,
        TRIPLE_CAPTAIN: counts.TRIPLE_CAPTAIN ?? 0,
      }));
  }, [chipsQuery.data]);

  const growthChartData = useMemo(() => {
    if (!growthQuery.data) return [];
    return growthQuery.data.buckets.map((bucket) => ({
      ...bucket,
      label: formatPeriodLabel(bucket.period, growthQuery.data.granularity),
    }));
  }, [growthQuery.data]);

  if (transfersQuery.isLoading && selectedGameweek === undefined) {
    return <FullPageSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-fpl-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-fpl-gray-500">
          Transfer trends, chip usage, and platform growth
        </p>
      </div>

      <ChartCard
        title="Transfer Trends"
        description="Most transferred-in and transferred-out players for a gameweek"
        controls={
          <label className="flex items-center gap-2 text-sm text-fpl-gray-700">
            <span className="font-medium">Gameweek</span>
            <select
              className="rounded-md border border-fpl-gray-200 px-2 py-1.5 text-sm"
              value={selectedGameweek ?? ''}
              onChange={(event) =>
                setSelectedGameweek(Number.parseInt(event.target.value, 10))
              }
            >
              {gameweeks.map((gameweek) => (
                <option key={gameweek.id} value={gameweek.number}>
                  GW {gameweek.number}
                  {gameweek.isCurrent ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </label>
        }
      >
        {transfersQuery.isError ? (
          <p className="text-sm text-fpl-pink">
            {getErrorMessage(transfersQuery.error, 'Failed to load transfer trends')}
          </p>
        ) : transfersQuery.isLoading ? (
          <EmptyChartMessage message="Loading transfer trends..." />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fpl-gray-500">
                Most Transferred In
              </h3>
              {transfersQuery.data?.transferredIn.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={transfersQuery.data.transferredIn}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="playerName"
                      width={90}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(value) => [value, 'Transfers']} />
                    <Bar dataKey="count" fill="#00ff87" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartMessage message="No transfers recorded for this gameweek" />
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fpl-gray-500">
                Most Transferred Out
              </h3>
              {transfersQuery.data?.transferredOut.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={transfersQuery.data.transferredOut}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="playerName"
                      width={90}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(value) => [value, 'Transfers']} />
                    <Bar dataKey="count" fill="#e90052" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartMessage message="No transfers recorded for this gameweek" />
              )}
            </div>
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="Chip Usage"
        description="Distribution of chips played across all users"
      >
        {chipsQuery.isError ? (
          <p className="text-sm text-fpl-pink">
            {getErrorMessage(chipsQuery.error, 'Failed to load chip usage')}
          </p>
        ) : chipsQuery.isLoading ? (
          <EmptyChartMessage message="Loading chip usage..." />
        ) : chipPieData.length === 0 ? (
          <EmptyChartMessage message="No chips have been played yet" />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chipPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {chipPieData.map((entry) => (
                    <Cell key={entry.chipType} fill={CHIP_COLORS[entry.chipType]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            {chipByGameweekData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chipByGameweekData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="gameweek" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="WILDCARD" stackId="chips" fill={CHIP_COLORS.WILDCARD} />
                  <Bar dataKey="FREE_HIT" stackId="chips" fill={CHIP_COLORS.FREE_HIT} />
                  <Bar dataKey="BENCH_BOOST" stackId="chips" fill={CHIP_COLORS.BENCH_BOOST} />
                  <Bar dataKey="TRIPLE_CAPTAIN" stackId="chips" fill={CHIP_COLORS.TRIPLE_CAPTAIN} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartMessage message="No per-gameweek chip breakdown available" />
            )}
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="Growth"
        description="Registrations and new teams created over time"
        controls={
          <div className="flex flex-wrap items-end gap-3">
            <Input
              label="From"
              type="date"
              value={growthFrom}
              onChange={(event) => setGrowthFrom(event.target.value)}
            />
            <Input
              label="To"
              type="date"
              value={growthTo}
              onChange={(event) => setGrowthTo(event.target.value)}
            />
            <div>
              <span className="mb-1 block text-xs font-medium text-fpl-gray-700">Granularity</span>
              <div className="flex gap-1">
                <Button
                  variant={growthGranularity === 'day' ? 'primary' : 'secondary'}
                  onClick={() => setGrowthGranularity('day')}
                >
                  Day
                </Button>
                <Button
                  variant={growthGranularity === 'week' ? 'primary' : 'secondary'}
                  onClick={() => setGrowthGranularity('week')}
                >
                  Week
                </Button>
              </div>
            </div>
          </div>
        }
      >
        {growthQuery.isError ? (
          <p className="text-sm text-fpl-pink">
            {getErrorMessage(growthQuery.error, 'Failed to load growth metrics')}
          </p>
        ) : growthQuery.isLoading ? (
          <EmptyChartMessage message="Loading growth metrics..." />
        ) : growthChartData.length === 0 ? (
          <EmptyChartMessage message="No data for the selected date range" />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={growthChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="registrations"
                name="Registrations"
                stroke="#37003c"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="teamsCreated"
                name="Teams Created"
                stroke="#00ff87"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
