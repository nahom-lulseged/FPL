import { useMemo, useState } from 'react';
import { ChipCardsSkeleton } from '@/components/common/Skeleton';
import { ChipCard, type ChipCardState } from '@/components/chips/ChipCard';
import { ChipConfirmModal } from '@/components/chips/ChipConfirmModal';
import { useChipStatus } from '@/hooks/useChipStatus';
import { usePlayChip } from '@/hooks/usePlayChip';
import {
  CHIP_META,
  formatChipLabel,
  WILDCARD_SECOND_HALF_START_GW,
} from '@/lib/chipMeta';
import { useGameweekStore } from '@/store/gameweekStore';
import type { ChipType } from '@/types/chip';
import { getErrorMessage } from '@/types/api';

interface ChipSelectorProps {
  teamId: string;
  canPlayChips: boolean;
  onChipPlayed?: () => void;
}

interface PendingChip {
  chipType: ChipType;
  wildcardNumber?: 1 | 2;
}

interface ChipDefinition {
  key: string;
  chipType: ChipType;
  wildcardNumber?: 1 | 2;
  label: string;
  description: string;
  isAvailable: boolean;
  disabledReason?: string;
}

export function ChipSelector({ teamId, canPlayChips, onChipPlayed }: ChipSelectorProps) {
  const [pendingChip, setPendingChip] = useState<PendingChip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentGameweek = useGameweekStore((s) => s.currentGameweek);
  const gwNumber = currentGameweek?.number ?? 1;

  const { data: chipStatus, isLoading } = useChipStatus(teamId);
  const playMutation = usePlayChip(teamId);

  const chips = useMemo((): ChipDefinition[] => {
    if (!chipStatus) {
      return [];
    }

    const { availability, history, activeThisGameweek } = chipStatus;

    const wc1Used = history.find((h) => h.chipType === 'WILDCARD' && h.wildcardNumber === 1);
    const wc2Used = history.find((h) => h.chipType === 'WILDCARD' && h.wildcardNumber === 2);
    const fhUsed = history.find((h) => h.chipType === 'FREE_HIT');
    const bbUsed = history.find((h) => h.chipType === 'BENCH_BOOST');
    const tcUsed = history.find((h) => h.chipType === 'TRIPLE_CAPTAIN');

    const wc1BeforeGw20 = gwNumber < WILDCARD_SECOND_HALF_START_GW;
    const wc2FromGw20 = gwNumber >= WILDCARD_SECOND_HALF_START_GW;

    const definitions: ChipDefinition[] = [
      {
        key: 'wildcard-1',
        chipType: 'WILDCARD',
        wildcardNumber: 1,
        label: 'Wildcard 1',
        description: CHIP_META.WILDCARD.shortDescription,
        isAvailable: availability.WILDCARD['1'],
        disabledReason: wc1Used
          ? `Used in GW ${wc1Used.gameweekNumber}`
          : !wc1BeforeGw20
            ? 'Only available before GW 20'
            : activeThisGameweek && activeThisGameweek !== 'WILDCARD'
              ? 'Another chip active this GW'
              : undefined,
      },
      {
        key: 'wildcard-2',
        chipType: 'WILDCARD',
        wildcardNumber: 2,
        label: 'Wildcard 2',
        description: CHIP_META.WILDCARD.shortDescription,
        isAvailable: availability.WILDCARD['2'],
        disabledReason: wc2Used
          ? `Used in GW ${wc2Used.gameweekNumber}`
          : !wc2FromGw20
            ? `Available from GW ${WILDCARD_SECOND_HALF_START_GW}`
            : activeThisGameweek && activeThisGameweek !== 'WILDCARD'
              ? 'Another chip active this GW'
              : undefined,
      },
      {
        key: 'free-hit',
        chipType: 'FREE_HIT',
        label: CHIP_META.FREE_HIT.label,
        description: CHIP_META.FREE_HIT.shortDescription,
        isAvailable: availability.FREE_HIT,
        disabledReason: fhUsed
          ? `Used in GW ${fhUsed.gameweekNumber}`
          : activeThisGameweek && activeThisGameweek !== 'FREE_HIT'
            ? 'Another chip active this GW'
            : undefined,
      },
      {
        key: 'bench-boost',
        chipType: 'BENCH_BOOST',
        label: CHIP_META.BENCH_BOOST.label,
        description: CHIP_META.BENCH_BOOST.shortDescription,
        isAvailable: availability.BENCH_BOOST,
        disabledReason: bbUsed
          ? `Used in GW ${bbUsed.gameweekNumber}`
          : activeThisGameweek && activeThisGameweek !== 'BENCH_BOOST'
            ? 'Another chip active this GW'
            : undefined,
      },
      {
        key: 'triple-captain',
        chipType: 'TRIPLE_CAPTAIN',
        label: CHIP_META.TRIPLE_CAPTAIN.label,
        description: CHIP_META.TRIPLE_CAPTAIN.shortDescription,
        isAvailable: availability.TRIPLE_CAPTAIN,
        disabledReason: tcUsed
          ? `Used in GW ${tcUsed.gameweekNumber}`
          : activeThisGameweek && activeThisGameweek !== 'TRIPLE_CAPTAIN'
            ? 'Another chip active this GW'
            : undefined,
      },
    ];

    return definitions;
  }, [chipStatus, gwNumber]);

  const getCardState = (chip: ChipDefinition): { state: ChipCardState; usedGameweek?: number } => {
    if (!chipStatus) {
      return { state: 'unavailable' };
    }

    const { activeThisGameweek, history } = chipStatus;

    const usedEntry = history.find((h) => {
      if (chip.chipType === 'WILDCARD') {
        return h.chipType === 'WILDCARD' && h.wildcardNumber === chip.wildcardNumber;
      }
      return h.chipType === chip.chipType;
    });

    if (usedEntry) {
      return { state: 'used', usedGameweek: usedEntry.gameweekNumber };
    }

    const isActive =
      activeThisGameweek === chip.chipType &&
      (chip.chipType !== 'WILDCARD' ||
        history.some(
          (h) =>
            h.gameweekNumber === gwNumber &&
            h.chipType === 'WILDCARD' &&
            h.wildcardNumber === chip.wildcardNumber,
        ));

    if (isActive) {
      return { state: 'active' };
    }

    if (!canPlayChips) {
      return { state: 'unavailable' };
    }

    if (chip.isAvailable) {
      return { state: 'available' };
    }

    return { state: 'unavailable' };
  };

  const handleConfirm = async () => {
    if (!pendingChip) {
      return;
    }

    setError(null);
    try {
      const paramMap = {
        WILDCARD: 'wildcard',
        FREE_HIT: 'free-hit',
        BENCH_BOOST: 'bench-boost',
        TRIPLE_CAPTAIN: 'triple-captain',
      } as const;

      await playMutation.mutateAsync({
        chipType: paramMap[pendingChip.chipType],
        body:
          pendingChip.chipType === 'WILDCARD' && pendingChip.wildcardNumber
            ? { wildcardNumber: pendingChip.wildcardNumber }
            : undefined,
      });

      setPendingChip(null);
      setSuccess(`${formatChipLabel(pendingChip.chipType, pendingChip.wildcardNumber)} played`);
      onChipPlayed?.();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to play chip'));
      setPendingChip(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-white/10 bg-fpl-purple/40 p-4">
        <ChipCardsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-fpl-purple/40 p-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Chips</h2>
        <p className="text-sm text-white/50">
          {canPlayChips
            ? 'Play one chip per gameweek before the deadline.'
            : 'Chips cannot be played after the deadline.'}
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-fpl-pink/40 bg-fpl-pink/10 px-3 py-2 text-sm text-fpl-pink">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-fpl-green/40 bg-fpl-green/10 px-3 py-2 text-sm text-fpl-green">
          {success}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {chips.map((chip) => {
          const meta = CHIP_META[chip.chipType];
          const { state, usedGameweek } = getCardState(chip);

          return (
            <ChipCard
              key={chip.key}
              label={chip.label}
              description={chip.description}
              state={state}
              accentClass={meta.accentClass}
              borderClass={meta.borderClass}
              bgClass={meta.bgClass}
              usedGameweek={usedGameweek}
              disabledReason={chip.disabledReason}
              onPlay={
                state === 'available'
                  ? () => {
                      setSuccess(null);
                      setPendingChip({
                        chipType: chip.chipType,
                        wildcardNumber: chip.wildcardNumber,
                      });
                    }
                  : undefined
              }
            />
          );
        })}
      </div>

      {pendingChip ? (
        <ChipConfirmModal
          open
          onClose={() => setPendingChip(null)}
          onConfirm={handleConfirm}
          chipType={pendingChip.chipType}
          wildcardNumber={pendingChip.wildcardNumber}
          isLoading={playMutation.isPending}
        />
      ) : null}
    </div>
  );
}
