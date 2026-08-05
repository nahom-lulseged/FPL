import clsx from 'clsx';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from 'react';
import {
  FplAddRemoveButton,
  FplInfoButton,
  FplWatchlistButton,
  IconReset,
  IconSearch,
  IconStar,
} from '@/components/common/FplButtons';
import { Input } from '@/components/common/Input';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { PlayerListSkeleton } from '@/components/common/Skeleton';
import { ClubBadge } from '@/components/pitch/ClubBadge';
import { FplFilterDropdown, FplFilterMenuItem } from '@/components/pitch/FplFilterDropdown';
import { PlayerScopeFilterMenu } from '@/components/pitch/PlayerScopeFilterMenu';
import { usePlayers } from '@/hooks/usePlayers';
import { useRealTeams } from '@/hooks/useRealTeams';
import { useWatchlist } from '@/hooks/useWatchlist';
import { formatPrice } from '@/lib/formatters';
import { canAddPlayer, getRemainingBudget, SQUAD_SIZE } from '@/lib/fplRules';
import {
  buildPriceTierOptions,
  getDefaultPriceTierValue,
  getPriceTierTriggerLabel,
  resolvePriceTierFilters,
  type PriceTierValue,
} from '@/lib/playerPriceTiers';
import {
  formatSortStatValue,
  getSortColumnAbbrev,
  getSortColumnLabel,
  PLAYER_SORT_OPTIONS,
} from '@/lib/playerSelectionSort';
import {
  getScopeFilterTriggerLabel,
  type TeamFilterValue,
} from '@/lib/playerScopeFilter';
import type { PlayerListItem, PlayerSortField, Position } from '@/types/player';

const PAGE_SIZE = 12;
const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

const POSITION_SHORT: Record<Position, string> = {
  GK: 'GKP',
  DEF: 'DEF',
  MID: 'MID',
  FWD: 'FWD',
};

const POSITION_SECTION: Record<Position, string> = {
  GK: 'Goalkeepers',
  DEF: 'Defenders',
  MID: 'Midfielders',
  FWD: 'Forwards',
};

type OpenFilter = 'scope' | 'sort' | 'price' | null;

export type PlayerSelectionVariant = 'modal' | 'sidebar';

interface PlayerSelectionPanelProps {
  activePosition: Position | null;
  activeSlotIndex: number | null;
  selectedPlayers: PlayerListItem[];
  onAdd: (player: PlayerListItem) => void;
  onRemove?: (playerId: string) => void;
  onPlayerInfo?: (playerId: string) => void;
  onAddSuccess?: (player: PlayerListItem) => void;
  title?: string;
  className?: string;
  compact?: boolean;
  showHeaderStats?: boolean;
  showTitle?: boolean;
  variant?: PlayerSelectionVariant;
}

function showStatusStar(player: PlayerListItem): boolean {
  return player.isAvailable && (player.selectedByPercent ?? 0) >= 10;
}

function usePlayerAddRow(
  player: PlayerListItem,
  selectedPlayers: PlayerListItem[],
  activePosition: Position | null,
  onAdd: (player: PlayerListItem) => void,
  onRemove?: (playerId: string) => void,
) {
  const [inlineReason, setInlineReason] = useState<string | null>(null);
  const isSelected = selectedPlayers.some((p) => p.id === player.id);
  const canAdd = canAddPlayer(selectedPlayers, player, activePosition);
  const disabled = isSelected ? !onRemove : !canAdd.ok || !player.isAvailable;

  useEffect(() => {
    if (!inlineReason) {
      return;
    }
    const timer = window.setTimeout(() => setInlineReason(null), 2000);
    return () => window.clearTimeout(timer);
  }, [inlineReason]);

  const handleClick = () => {
    if (isSelected) {
      onRemove?.(player.id);
      return;
    }
    if (!canAdd.ok || !player.isAvailable) {
      setInlineReason(canAdd.reason ?? 'Cannot add this player');
      return;
    }
    onAdd(player);
  };

  return { isSelected, disabled, inlineReason, handleClick };
}

function PlayerSelectionRow({
  player,
  selectedPlayers,
  activePosition,
  sortBy,
  watched,
  onToggleWatchlist,
  onAdd,
  onRemove,
  onPlayerInfo,
}: {
  player: PlayerListItem;
  selectedPlayers: PlayerListItem[];
  activePosition: Position | null;
  sortBy: PlayerSortField;
  watched: boolean;
  onToggleWatchlist: (playerId: string) => void;
  onAdd: (player: PlayerListItem) => void;
  onRemove?: (playerId: string) => void;
  onPlayerInfo?: (playerId: string) => void;
}) {
  const { isSelected, disabled, inlineReason, handleClick } = usePlayerAddRow(
    player,
    selectedPlayers,
    activePosition,
    onAdd,
    onRemove,
  );

  return (
    <div className={clsx(!player.isAvailable && 'opacity-50')}>
      <div className="squad-player-row flex items-center gap-3 border-b border-white/10">
        <FplWatchlistButton
          watched={watched}
          playerName={player.name}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            onToggleWatchlist(player.id);
          }}
        />
        <FplInfoButton
          label={`Info about ${player.name}`}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            onPlayerInfo?.(player.id);
          }}
        />
        <ClubBadge shortName={player.realTeam.shortName} playerName={player.name} size="sm" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[1.06rem] font-extrabold leading-tight text-white">{player.name}</p>
          <p className="mt-1 flex items-center gap-1 truncate text-sm text-white/55">
            <span>
              {player.realTeam.name} {POSITION_SHORT[player.position]}
            </span>
            {showStatusStar(player) ? (
              <IconStar className="h-3 w-3 shrink-0 text-fpl-green" />
            ) : null}
          </p>
        </div>

        <span className="mx-2 h-11 w-px shrink-0 bg-white/20" aria-hidden />

        <span className="w-16 shrink-0 text-right text-base font-bold tabular-nums text-white">
          {formatPrice(player.price)}
        </span>
        <span className="w-11 shrink-0 text-right text-base font-bold tabular-nums text-white">
          {formatSortStatValue(player, sortBy)}
        </span>

        <FplAddRemoveButton
          mode={isSelected ? 'remove' : 'add'}
          disabled={disabled}
          playerName={player.name}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            handleClick();
          }}
        />
      </div>
      {inlineReason ? <p className="pb-2 text-xs text-fpl-pink">{inlineReason}</p> : null}
    </div>
  );
}

function PositionSectionHeader({
  title,
  sortAbbrev,
  sortLabel,
}: {
  title: string;
  sortAbbrev: string;
  sortLabel: string;
}) {
  return (
    <div className="mb-1 mt-5 flex items-end justify-between gap-2 first:mt-0">
      <h3 className="text-[1.35rem] font-extrabold leading-tight text-white">{title}</h3>
      <div className="flex gap-3 text-sm font-extrabold text-white/60">
        <span className="w-16 text-right">Price</span>
        <span
          className="w-11 text-right underline decoration-dotted decoration-white/40 underline-offset-2"
          title={sortLabel}
        >
          {sortAbbrev}
        </span>
        <span className="w-9" aria-hidden />
      </div>
    </div>
  );
}

/** FPL-style horizontal track under the filter pills (visual affordance for scroll). */
function FilterScrollTrack({
  scrollRef,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const [metrics, setMetrics] = useState({ scrollLeft: 0, scrollWidth: 0, clientWidth: 0 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    const update = () => {
      setMetrics({
        scrollLeft: el.scrollLeft,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      });
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(el);
    }

    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      resizeObserver?.disconnect();
    };
  }, [scrollRef]);

  const { scrollLeft, scrollWidth, clientWidth } = metrics;
  const overflow = scrollWidth > clientWidth + 2;
  if (!overflow) {
    return (
      <div className="flex h-3 items-center gap-1 px-0.5" aria-hidden>
        <span className="text-[8px] leading-none text-white/35">◀</span>
        <div className="h-1 flex-1 rounded-full bg-white/15" />
        <span className="text-[8px] leading-none text-white/35">▶</span>
      </div>
    );
  }

  const thumbRatio = clientWidth / scrollWidth;
  const thumbWidth = Math.max(thumbRatio * 100, 18);
  const maxLeft = 100 - thumbWidth;
  const thumbLeft = maxLeft <= 0 ? 0 : (scrollLeft / (scrollWidth - clientWidth)) * maxLeft;

  return (
    <div className="flex h-3 items-center gap-1 px-0.5" aria-hidden>
      <span className="text-[8px] leading-none text-white/35">◀</span>
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/15">
        <div
          className="absolute top-0 h-full rounded-full bg-white/45"
          style={{ width: `${thumbWidth}%`, left: `${thumbLeft}%` }}
        />
      </div>
      <span className="text-[8px] leading-none text-white/35">▶</span>
    </div>
  );
}

const paginationBtnClass =
  'inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-white bg-transparent text-white transition hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-fpl-cyan disabled:cursor-not-allowed disabled:border-white/30 disabled:text-white/30';

function IconChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12.5 4.5 7 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7.5 4.5 13 10l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronDoubleLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10.5 4.5 5 10l5.5 5.5M15.5 4.5 10 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronDoubleRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M9.5 4.5 15 10l-5.5 5.5M4.5 4.5 10 10l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlayerSelectionPanel({
  activePosition,
  activeSlotIndex,
  selectedPlayers,
  onAdd,
  onRemove,
  onPlayerInfo,
  onAddSuccess,
  title = 'Player Selection',
  className,
  showHeaderStats = true,
  showTitle = true,
  variant = 'modal',
}: PlayerSelectionPanelProps) {
  const { data: realTeams } = useRealTeams();
  const { ids: watchlistIds, isWatched, toggle: toggleWatchlist } = useWatchlist();
  const isSidebar = variant === 'sidebar';
  const teams = realTeams ?? [];

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState<Position | 'all'>(activePosition ?? 'all');
  const [sortBy, setSortBy] = useState<PlayerSortField>('totalPoints');
  const [priceTier, setPriceTier] = useState<PriceTierValue | null>(null);
  const [teamFilter, setTeamFilter] = useState<TeamFilterValue>(
    activePosition ? `pos-${activePosition}` : 'all',
  );
  const [page, setPage] = useState(1);
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);
  const filterScrollRef = useRef<HTMLDivElement>(null);

  const isWatchlistFilter = teamFilter === 'watchlist';
  const watchlistEmpty = isWatchlistFilter && watchlistIds.length === 0;

  const resetFilters = useCallback(() => {
    setSearchInput('');
    setDebouncedSearch('');
    setPositionFilter(activePosition ?? 'all');
    setSortBy('totalPoints');
    setPriceTier(null);
    setTeamFilter(activePosition ? `pos-${activePosition}` : 'all');
    setPage(1);
    setOpenFilter(null);
  }, [activePosition]);

  useEffect(() => {
    if (activePosition !== null) {
      setPositionFilter(activePosition);
      setTeamFilter(`pos-${activePosition}`);
      setPage(1);
    }
  }, [activePosition, activeSlotIndex]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, positionFilter, sortBy, priceTier, teamFilter, watchlistIds]);

  const remainingBudget = getRemainingBudget(selectedPlayers);
  const slotConstraint = activePosition;

  const filtersWithoutPrice = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      position:
        isWatchlistFilter || positionFilter === 'all' ? undefined : positionFilter,
      teamId: teamFilter.startsWith('club-') ? teamFilter.slice(5) : undefined,
      ids: isWatchlistFilter && watchlistIds.length > 0 ? watchlistIds.join(',') : undefined,
      sortBy,
      sortDir: 'desc' as const,
      page,
      limit: PAGE_SIZE,
    }),
    [
      debouncedSearch,
      positionFilter,
      teamFilter,
      sortBy,
      page,
      isWatchlistFilter,
      watchlistIds,
    ],
  );

  const boundsQuery = usePlayers(
    {
      ...filtersWithoutPrice,
      page: 1,
      limit: 1,
    },
    { enabled: !watchlistEmpty },
  );

  const priceBounds = boundsQuery.data?.meta.priceBounds;

  useEffect(() => {
    if (priceTier !== null || !priceBounds) {
      return;
    }
    const defaults = getDefaultPriceTierValue(priceBounds);
    if (defaults) {
      setPriceTier(defaults);
    }
  }, [priceBounds, priceTier]);

  const tierOptionsWithBounds = useMemo(
    () => buildPriceTierOptions(priceBounds, remainingBudget),
    [priceBounds, remainingBudget],
  );

  const priceFilters = resolvePriceTierFilters(priceTier, tierOptionsWithBounds, priceBounds);

  const filters = useMemo(
    () => ({
      ...filtersWithoutPrice,
      minPrice: priceFilters.minPrice,
      maxPrice: priceFilters.maxPrice,
    }),
    [filtersWithoutPrice, priceFilters],
  );

  const { data, isLoading, isError, error, refetch } = usePlayers(filters, {
    enabled: !watchlistEmpty,
  });

  const handleTeamFilterChange = (value: TeamFilterValue) => {
    setTeamFilter(value);
    if (value.startsWith('pos-')) {
      setPositionFilter(value.slice(4) as Position);
    } else if (value === 'all') {
      setPositionFilter(activePosition ?? 'all');
    } else if (value === 'watchlist') {
      setPositionFilter('all');
    } else if (value.startsWith('club-')) {
      setPositionFilter(activePosition ?? 'all');
    }
    setOpenFilter(null);
  };

  const handleAdd = (player: PlayerListItem) => {
    onAdd(player);
    onAddSuccess?.(player);
  };

  const setFilterOpen = (id: Exclude<OpenFilter, null>, open: boolean) => {
    setOpenFilter(open ? id : null);
  };

  const totalPages = data?.meta.totalPages ?? 1;
  const totalShown = watchlistEmpty ? 0 : (data?.meta.total ?? data?.data.length ?? 0);
  const sortColumnAbbrev = getSortColumnAbbrev(sortBy);
  const sortColumnLabel = getSortColumnLabel(sortBy);

  const playersByPosition = useMemo(() => {
    const list = data?.data ?? [];
    if (positionFilter !== 'all') {
      return [{ position: positionFilter, players: list }] as const;
    }
    return POSITIONS.map((position) => ({
      position,
      players: list.filter((p) => p.position === position),
    })).filter((group) => group.players.length > 0);
  }, [data?.data, positionFilter]);

  const hasPlayers = !watchlistEmpty && (data?.data?.length ?? 0) > 0;
  const showLoading = !watchlistEmpty && isLoading;

  const scopeTriggerLabel = getScopeFilterTriggerLabel(teamFilter, teams);
  const sortTriggerLabel =
    PLAYER_SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? 'Total points';
  const priceTriggerLabel = getPriceTierTriggerLabel(priceTier, tierOptionsWithBounds, priceBounds);

  return (
    <section
      className={clsx(
        isSidebar && 'fpl-surface-panel flex min-w-0 w-full flex-col',
        className,
      )}
    >
      {showTitle ? (
        <div className="mb-6 shrink-0">
          <h2 className="squad-builder-panel-title tracking-tight text-white">{title}</h2>
          <p className="squad-builder-copy mt-2">
            Select a maximum of 3 players from a single team or &apos;Auto Pick&apos; if you&apos;re
            short of time.
          </p>
          {showHeaderStats && !isSidebar ? (
            <p className="mt-1 text-sm text-fpl-green">
              Players selected {selectedPlayers.length}/{SQUAD_SIZE} · Bank{' '}
              {formatPrice(remainingBudget)}
            </p>
          ) : null}
          {isSidebar && activePosition ? (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-fpl-green/15 px-3 py-1.5 text-xs font-semibold text-fpl-green ring-1 ring-fpl-green/30">
              <span className="h-1.5 w-1.5 rounded-full bg-fpl-green" aria-hidden />
              Selecting: {POSITION_SHORT[activePosition] ?? activePosition}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={clsx('space-y-2.5')}>
        <Input
          label="Find a player"
          placeholder="Search by name"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          leadingIcon={<IconSearch className="h-7 w-7" />}
          variant="outline"
          labelBold
        />

        <div className="space-y-1.5">
          <div
            ref={filterScrollRef}
            data-lenis-prevent
            className="flex gap-2.5 overflow-x-auto pb-0.5 scrollbar-none"
          >
            <FplFilterDropdown
              label="Team"
              triggerLabel={scopeTriggerLabel}
              open={openFilter === 'scope'}
              onOpenChange={(open) => setFilterOpen('scope', open)}
              align="stretch"
              maxHeight={480}
              className="min-w-[8.5rem] shrink-0 basis-[8.5rem] sm:min-w-[8.7rem] sm:basis-[8.7rem]"
            >
              <PlayerScopeFilterMenu
                value={teamFilter}
                teams={teams}
                onChange={handleTeamFilterChange}
              />
            </FplFilterDropdown>

            <FplFilterDropdown
              label="Sort"
              triggerLabel={sortTriggerLabel}
              open={openFilter === 'sort'}
              onOpenChange={(open) => setFilterOpen('sort', open)}
              className="min-w-[9.4rem] shrink-0 basis-[9.4rem] sm:min-w-[9.8rem] sm:basis-[9.8rem]"
            >
              <div role="listbox" aria-label="Sort">
                {PLAYER_SORT_OPTIONS.map((option) => (
                  <FplFilterMenuItem
                    key={option.value}
                    selected={sortBy === option.value}
                    onSelect={() => {
                      setSortBy(option.value);
                      setOpenFilter(null);
                    }}
                  >
                    {option.label}
                  </FplFilterMenuItem>
                ))}
              </div>
            </FplFilterDropdown>

            <FplFilterDropdown
              label="Price"
              triggerLabel={priceTriggerLabel}
              open={openFilter === 'price'}
              onOpenChange={(open) => setFilterOpen('price', open)}
              className="min-w-[6.8rem] shrink-0 basis-[6.8rem] sm:min-w-[7rem] sm:basis-[7rem]"
            >
              <div role="listbox" aria-label="Price">
                {tierOptionsWithBounds.map((option) => (
                  <FplFilterMenuItem
                    key={option.value}
                    selected={priceTier === option.value}
                    onSelect={() => {
                      setPriceTier(option.value);
                      setOpenFilter(null);
                    }}
                  >
                    {option.label}
                  </FplFilterMenuItem>
                ))}
              </div>
            </FplFilterDropdown>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/55 bg-transparent px-3.5 text-base font-bold text-white transition hover:border-white/70 hover:bg-white/5"
            >
              Reset
              <IconReset className="h-4 w-4 shrink-0" />
            </button>
          </div>

          <div className="squad-filter-track">
            <FilterScrollTrack scrollRef={filterScrollRef} />
          </div>
        </div>

        <div className="rounded-lg bg-gradient-to-r from-[#00f2ff] via-[#3d8bff] to-[#7085ff] px-4 py-2.5 text-center text-base font-extrabold text-[#1a0024]">
          {totalShown} players shown
        </div>

        <div className="overflow-hidden scrollbar-none">
          {showLoading ? <PlayerListSkeleton /> : null}
          {!watchlistEmpty && isError ? (
            <QueryErrorState
              error={error}
              message="Failed to load players"
              onRetry={() => void refetch()}
            />
          ) : null}
          {watchlistEmpty ? (
            <p className="py-6 text-center text-sm text-white/60">
              No players on your watchlist.
            </p>
          ) : null}
          {!showLoading && !isError && !watchlistEmpty && !hasPlayers ? (
            <p className="py-6 text-center text-sm text-white/60">No players match your filters.</p>
          ) : null}
          {!showLoading && !isError && hasPlayers
            ? playersByPosition.map((group) => (
                <section key={group.position}>
                  <PositionSectionHeader
                    title={POSITION_SECTION[group.position]}
                    sortAbbrev={sortColumnAbbrev}
                    sortLabel={sortColumnLabel}
                  />
                  {group.players.map((player) => (
                    <PlayerSelectionRow
                      key={player.id}
                      player={player}
                      selectedPlayers={selectedPlayers}
                      activePosition={slotConstraint}
                      sortBy={sortBy}
                      watched={isWatched(player.id)}
                      onToggleWatchlist={toggleWatchlist}
                      onAdd={handleAdd}
                      onRemove={onRemove}
                      onPlayerInfo={onPlayerInfo}
                    />
                  ))}
                </section>
              ))
            : null}
        </div>

        {!watchlistEmpty && data?.meta ? (
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                className={paginationBtnClass}
                aria-label="First page"
              >
                <IconChevronDoubleLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className={paginationBtnClass}
                aria-label="Previous page"
              >
                <IconChevronLeft className="h-5 w-5" />
              </button>
            </div>
            <span className="text-sm font-bold text-white">
              {data.meta.page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className={paginationBtnClass}
                aria-label="Next page"
              >
                <IconChevronRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                className={paginationBtnClass}
                aria-label="Last page"
              >
                <IconChevronDoubleRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
