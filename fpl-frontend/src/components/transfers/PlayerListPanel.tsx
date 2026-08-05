import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, SlidersHorizontal } from 'lucide-react';
import { PlayerListRow } from '@/components/transfers/PlayerListRow';
import { PlayerListSkeleton } from '@/components/common/Skeleton';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { ShirtVisual } from '@/components/pitch/PlayerCard';
import { usePlayers } from '@/hooks/usePlayers';
import { useRealTeams } from '@/hooks/useRealTeams';
import { BUDGET_TENTHS } from '@/lib/fplRules';
import { formatPrice } from '@/lib/formatters';
import type { PlayerListItem, Position } from '@/types/player';
import type { PlayerSortField } from '@/types/player';

const POSITIONS: Array<Position | 'ALL'> = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];

interface PlayerListPanelBaseProps {
  selectedPlayers: PlayerListItem[];
  activePosition?: Position | null;
  mode?: 'builder' | 'transfer';
  maxAffordablePrice?: number;
}

interface BuilderPanelProps extends PlayerListPanelBaseProps {
  mode?: 'builder';
  onAdd: (player: PlayerListItem) => void;
}

interface TransferPanelProps extends PlayerListPanelBaseProps {
  mode: 'transfer';
  availableBank?: number;
  outgoingPlayer?: PlayerListItem | null;
  onTransferIn: (player: PlayerListItem) => void;
  canTransferIn?: (player: PlayerListItem) => { ok: boolean; reason?: string };
}

type PlayerListPanelProps = BuilderPanelProps | TransferPanelProps;

export function PlayerListPanel(props: PlayerListPanelProps) {
  const { selectedPlayers, activePosition, mode = 'builder', maxAffordablePrice } = props;
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState<Position | 'ALL'>('ALL');
  const [teamId, setTeamId] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<PlayerSortField>('selectedByPercent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: realTeams } = useRealTeams();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, positionFilter, teamId, minPrice, maxPrice, activePosition]);

  const effectivePosition =
    activePosition ?? (positionFilter === 'ALL' ? undefined : positionFilter);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      position: effectivePosition,
      teamId: teamId || undefined,
      minPrice: minPrice ? Math.max(0, Number(minPrice)) : undefined,
      maxPrice: maxPrice
        ? Math.min(Number(maxPrice), BUDGET_TENTHS)
        : mode === 'builder'
          ? maxAffordablePrice
          : undefined,
      sortBy,
      sortDir,
      page,
      limit: 50,
    }),
    [debouncedSearch, effectivePosition, teamId, minPrice, maxPrice, maxAffordablePrice, mode, page, sortBy, sortDir],
  );

  const { data, isLoading, isError, error, refetch } = usePlayers(filters);

  const helperText =
    mode === 'transfer' && activePosition
      ? `Filtering for ${activePosition} — pick a replacement`
      : activePosition
        ? `Filtering for ${activePosition} — pick a player to fill the selected slot`
        : mode === 'transfer'
          ? 'Select a player on the pitch to transfer out first'
          : null;

  const transferProps = mode === 'transfer' ? props as TransferPanelProps : null;

  const updateSort = (field: PlayerSortField) => {
    if (sortBy === field) {
      setSortDir((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortBy(field);
    setSortDir(field === 'price' ? 'asc' : 'desc');
  };

  const sortIcon = (field: PlayerSortField) => {
    if (sortBy !== field) return <ArrowUpDown aria-hidden="true" />;
    return sortDir === 'asc' ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />;
  };

  if (mode === 'transfer') {
    return (
      <div className="transfer-add-player-screen">
        <div className="transfer-bank-banner">
          Bank {formatPrice(transferProps?.availableBank ?? maxAffordablePrice ?? 0)}
        </div>

        <label className="transfer-search-field">
          <Search aria-hidden="true" />
          <span className="sr-only">Search by name</span>
          <input
            placeholder="Search by name"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>

        <div className="transfer-filter-row">
          <button
            type="button"
            className="transfer-filter-icon"
            aria-label="Advanced filters"
            aria-expanded={advancedOpen}
            aria-controls="transfer-advanced-filters"
            onClick={() => setAdvancedOpen((current) => !current)}
          >
            <SlidersHorizontal aria-hidden="true" />
          </button>
          <select
            value={activePosition ?? positionFilter}
            disabled={Boolean(activePosition)}
            onChange={(event) => setPositionFilter(event.target.value as Position | 'ALL')}
          >
            {POSITIONS.map((pos) => <option key={pos} value={pos}>{pos === 'ALL' ? 'All Positions' : pos}</option>)}
          </select>
          <select value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)}>
            <option value="">Unlimited</option>
            {[45, 55, 65, 75, 85, 100, 125, 150].map((price) => (
              <option key={price} value={price}>Up to {formatPrice(price)}</option>
            ))}
          </select>
          <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
            <option value="">All Clubs</option>
            {realTeams?.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>

        {advancedOpen ? (
          <div id="transfer-advanced-filters" className="transfer-advanced-filters">
            <label>
              <span>Minimum price</span>
              <input
                type="number"
                min={0}
                max={BUDGET_TENTHS}
                value={minPrice}
                placeholder="Any"
                onChange={(event) => setMinPrice(event.target.value)}
              />
            </label>
            <label>
              <span>Maximum price</span>
              <input
                type="number"
                min={0}
                max={BUDGET_TENTHS}
                value={maxPrice}
                placeholder="Any"
                onChange={(event) => setMaxPrice(event.target.value)}
              />
            </label>
            <button type="button" onClick={() => { setMinPrice(''); setMaxPrice(''); setTeamId(''); }}>
              Clear filters
            </button>
          </div>
        ) : null}

        {transferProps?.outgoingPlayer ? (
          <section className="transfer-outgoing-panel" aria-label="Outgoing player">
            <h2>Outgoing Player</h2>
            <div className="transfer-player-table-row transfer-player-table-row--outgoing">
              <span className="fpl-list-info" aria-hidden="true">i</span>
              <span className="fpl-list-shirt" aria-hidden="true"><ShirtVisual shortName={transferProps.outgoingPlayer.realTeam.shortName} position={transferProps.outgoingPlayer.position} clubId={transferProps.outgoingPlayer.realTeam.id} /></span>
              <span className="fpl-list-player">
                <strong>{transferProps.outgoingPlayer.name}</strong>
                <small>{transferProps.outgoingPlayer.realTeam.name} {transferProps.outgoingPlayer.position}</small>
              </span>
              <span>{transferProps.outgoingPlayer.eventPoints.toFixed(1)}</span>
              <span>{formatPrice(transferProps.outgoingPlayer.price)}</span>
              <span>{transferProps.outgoingPlayer.selectedByPercent.toFixed(1)}%</span>
            </div>
          </section>
        ) : null}

        <div className="transfer-player-table" role="table" aria-label="Replacement players" data-lenis-prevent>
          <div className="transfer-player-table-header" role="row">
            <button role="columnheader" aria-sort={sortBy === 'totalPoints' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} type="button" onClick={() => updateSort('totalPoints')}>Player {sortIcon('totalPoints')}</button>
            <button role="columnheader" aria-sort={sortBy === 'eventPoints' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} type="button" onClick={() => updateSort('eventPoints')}>Form {sortIcon('eventPoints')}</button>
            <button role="columnheader" aria-sort={sortBy === 'price' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} type="button" onClick={() => updateSort('price')}>Current Price {sortIcon('price')}</button>
            <button role="columnheader" aria-sort={sortBy === 'selectedByPercent' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} type="button" onClick={() => updateSort('selectedByPercent')}>Selected {sortIcon('selectedByPercent')}</button>
          </div>

          {isLoading ? <PlayerListSkeleton /> : null}
          {isError ? (
            <QueryErrorState
              error={error}
              message="Failed to load players"
              onRetry={() => void refetch()}
            />
          ) : null}
          {data?.data.map((player) => {
            const isSelected = selectedPlayers.some((candidate) => candidate.id === player.id);
            const check = transferProps?.canTransferIn?.(player) ?? { ok: false, reason: 'Select a player to transfer out' };
            const disabled = isSelected || !check.ok || !player.isAvailable || !activePosition;
            return (
              <button
                key={player.id}
                type="button"
                className="transfer-player-table-row"
                disabled={disabled}
                role="row"
                aria-label={`${player.name}, ${player.realTeam.name}, ${formatPrice(player.price)}${disabled && check.reason ? `, ${check.reason}` : ''}`}
                title={disabled ? check.reason : undefined}
                onClick={() => transferProps?.onTransferIn(player)}
              >
                <span className="fpl-list-info" aria-hidden="true">{player.isAvailable ? 'i' : '!'}</span>
                <span className="fpl-list-shirt" aria-hidden="true"><ShirtVisual shortName={player.realTeam.shortName} position={player.position} clubId={player.realTeam.id} /></span>
                <span className="fpl-list-player">
                  <strong>{player.name}</strong>
                  <small>{player.realTeam.name} {player.position}</small>
                  {isSelected ? <em>In squad</em> : disabled && check.reason ? <em>{check.reason}</em> : null}
                </span>
                <span>{player.eventPoints.toFixed(1)}</span>
                <span>{formatPrice(player.price)}</span>
                <span>{player.selectedByPercent.toFixed(1)}%</span>
              </button>
            );
          })}
          {!isLoading && data?.data.length === 0 ? (
            <p className="text-center text-sm text-white/70">No players match your filters.</p>
          ) : null}
        </div>

        {data?.meta ? (
          <div className="transfer-pagination">
            <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span>Page {data.meta.page} of {data.meta.totalPages}</span>
            <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="fpl-surface-panel flex flex-col">
      <div className="space-y-3 border-b border-white/10 pb-4">
        <h2 className="text-xl font-extrabold tracking-tight text-white">Player list</h2>
        {helperText ? <p className="text-sm text-fpl-green">{helperText}</p> : null}
        <Input
          label="Search"
          placeholder="Player name..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <div data-lenis-prevent className="flex flex-wrap gap-1.5 overflow-x-auto scrollbar-none">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              disabled={Boolean(activePosition)}
              aria-pressed={positionFilter === pos}
              onClick={() => setPositionFilter(pos)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                positionFilter === pos
                  ? 'border-fpl-green bg-fpl-green text-fpl-purple'
                  : 'border-white/30 bg-[#2a0033] text-white/80 hover:border-white/50 disabled:opacity-40'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-white/70">Club</span>
            <select
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
              className="w-full rounded-full border border-white/35 bg-[#2a0033] px-3.5 py-2 text-sm font-medium text-white"
            >
              <option value="">All clubs</option>
              {realTeams?.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label={`Max price (tenths, max ${BUDGET_TENTHS})`}
            type="number"
            min={0}
            placeholder="e.g. 100"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2 pt-4">
        {maxAffordablePrice != null ? (
          <p className="player-list-budget" role="status">
            Maximum affordable price: £{(maxAffordablePrice / 10).toFixed(1)}m
          </p>
        ) : null}
        {isLoading ? <PlayerListSkeleton /> : null}
        {isError ? (
          <QueryErrorState
            error={error}
            message="Failed to load players"
            onRetry={() => void refetch()}
          />
        ) : null}
        {data?.data.map((player) => (
          <PlayerListRow
            key={player.id}
            player={player}
            selectedPlayers={selectedPlayers}
            activePosition={activePosition}
            mode="builder"
            onAdd={(props as BuilderPanelProps).onAdd}
          />
        ))}
        {!isLoading && data?.data.length === 0 ? (
          <p className="text-center text-sm text-white/70">No players match your filters.</p>
        ) : null}
      </div>

      {data?.meta ? (
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-white/60">
            Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} players)
          </span>
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
