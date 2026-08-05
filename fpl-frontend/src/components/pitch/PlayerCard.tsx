import clsx from 'clsx';
import { ArrowLeftRight, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { AutoSubBadge } from '@/components/pitch/AutoSubBadge';
import { getJerseyDataUri } from '@/lib/clubJersey';
import { getClubJerseyAsset } from '@/lib/constants/jerseyAssets';
import { formatPrice } from '@/lib/formatters';
import type { Position } from '@/types/player';
import type { PointsStatus } from '@/types/team';

export type PlayerCardVariant = 'empty' | 'filled' | 'active';
export type PlayerCardLayout = 'default' | 'shirt';
export type PlayerCardBadgeMode = 'price' | 'status';

interface PlayerCardProps {
  name?: string;
  shortName?: string;
  price?: number;
  badgeMode?: PlayerCardBadgeMode;
  availabilityStatus?: string;
  chanceOfPlayingNextRound?: number | null;
  position?: Position;
  clubId?: string;
  variant?: PlayerCardVariant;
  layout?: PlayerCardLayout;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isStarter?: boolean;
  points?: number | null;
  displayText?: string;
  wasSubstitutedIn?: boolean | null;
  wasSubstitutedOut?: boolean | null;
  pointsStatus?: PointsStatus;
  dimmed?: boolean;
  disabled?: boolean;
  transferOut?: boolean;
  pendingTransfer?: boolean;
  builderMode?: boolean;
  showCaptainControls?: boolean;
  showSwitchControl?: boolean;
  switchModeActive?: boolean;
  isSwitchSelected?: boolean;
  isSwitchTargetValid?: boolean;
  onClick?: () => void;
  onMakeCaptain?: () => void;
  onMakeVice?: () => void;
  onBenchUp?: () => void;
  onBenchDown?: () => void;
  className?: string;
}

const POSITION_LABELS: Record<Position, string> = {
  GK: 'GKP',
  DEF: 'DEF',
  MID: 'MID',
  FWD: 'FWD',
};

export function ShirtVisual({
  shortName,
  position,
  clubId,
}: {
  shortName: string;
  position?: Position;
  clubId?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const asset = imageFailed ? null : getClubJerseyAsset(shortName, position, clubId);

  return (
    <div
      className="relative mx-auto flex h-11 w-9 items-center justify-center sm:h-12 sm:w-10"
      aria-hidden="true"
    >
      {asset ? (
        <img
          src={asset.src}
          alt=""
          width={asset.width}
          height={asset.height}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain drop-shadow-sm"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <img
          src={getJerseyDataUri(shortName)}
          alt=""
          width={100}
          height={112}
          className="h-full w-full object-contain drop-shadow-sm"
        />
      )}
    </div>
  );
}

function getAvailabilityBadge(status?: string, chance?: number | null) {
  const normalized = status?.toLowerCase();
  if ((!normalized || normalized === 'a') && (chance === null || chance === undefined || chance === 100)) {
    return null;
  }
  if (normalized === 'd' || (chance !== null && chance !== undefined && chance > 0 && chance < 100)) {
    return { className: 'is-doubtful', label: chance ? `Doubtful, ${chance}% chance of playing` : 'Doubtful' };
  }
  if (['i', 'u', 's', 'n'].includes(normalized ?? '') || chance === 0) {
    return { className: 'is-unavailable', label: 'Unavailable' };
  }
  return null;
}

function truncateName(name: string, max = 9): string {
  if (name.length <= max) {
    return name;
  }
  return `${name.slice(0, max - 1)}…`;
}

export function PlayerCard({
  name,
  shortName,
  price,
  badgeMode = 'price',
  availabilityStatus,
  chanceOfPlayingNextRound,
  position,
  clubId,
  variant = 'empty',
  layout = 'default',
  isCaptain = false,
  isViceCaptain = false,
  isStarter = false,
  points,
  displayText,
  wasSubstitutedIn,
  wasSubstitutedOut,
  pointsStatus,
  dimmed = false,
  disabled = false,
  transferOut = false,
  pendingTransfer = false,
  builderMode = false,
  showCaptainControls = false,
  showSwitchControl = false,
  switchModeActive = false,
  isSwitchSelected = false,
  isSwitchTargetValid = true,
  onClick,
  onMakeCaptain,
  onMakeVice,
  onBenchUp,
  onBenchDown,
  className,
}: PlayerCardProps) {
  const isEmpty = variant === 'empty' || transferOut;
  const showProvisional = pointsStatus === 'provisional' && points !== null && points !== undefined;
  const useShirtLayout = layout === 'shirt';
  const showArmbandControls = showCaptainControls && isStarter && !isEmpty;
  const showBenchControls = Boolean(onBenchUp || onBenchDown) && !isStarter && !isEmpty;
  const availabilityBadge = badgeMode === 'status'
    ? getAvailabilityBadge(availabilityStatus, chanceOfPlayingNextRound)
    : null;
  const armband = isStarter && (isCaptain || isViceCaptain)
    ? (isCaptain ? 'C' : 'V')
    : null;
  const switchLabel = isSwitchSelected
    ? 'Cancel'
    : switchModeActive
      ? isSwitchTargetValid
        ? 'Pick'
        : 'Unavailable'
      : 'Switch';
  const switchControl = showSwitchControl && !isEmpty && onClick ? (
    <button
      type="button"
      className={clsx(
        'absolute left-1/2 top-1 z-30 min-h-7 -translate-x-1/2 rounded-full px-2.5 text-[9px] font-black shadow-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fpl-cyan',
        isSwitchSelected
          ? 'bg-fpl-cyan text-fpl-purple'
          : isSwitchTargetValid
            ? 'bg-fpl-purple text-white hover:bg-fpl-purple-700'
            : 'bg-black/60 text-white/70',
      )}
      aria-label={
        isSwitchSelected
          ? `Cancel switch for ${name}`
          : switchModeActive
            ? isSwitchTargetValid
              ? `Switch with ${name}`
              : `${name} is not a valid switch`
            : `Switch ${name}`
      }
      aria-disabled={switchModeActive && !isSwitchSelected && !isSwitchTargetValid}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {switchLabel}
    </button>
  ) : null;

  const ariaLabel = isEmpty
    ? `Empty ${position ?? 'player'} slot`
    : [
        name,
        position,
        badgeMode === 'price' && price !== undefined ? formatPrice(price) : null,
        availabilityBadge?.label,
        displayText,
        isCaptain ? 'captain' : null,
        isViceCaptain ? 'vice captain' : null,
        points !== null && points !== undefined ? `${points} points` : null,
      ]
        .filter(Boolean)
        .join(', ');

  const armbandControls = showArmbandControls ? (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center gap-0.5 bg-black/50 p-0.5">
      <button
        type="button"
        className={clsx(
          'rounded px-1 text-[9px] font-bold',
          isCaptain ? 'bg-fpl-pink text-white' : 'bg-white/20 text-white hover:bg-white/40',
        )}
        aria-label={`Make ${name} captain`}
        onClick={(event) => {
          event.stopPropagation();
          onMakeCaptain?.();
        }}
      >
        C
      </button>
      <button
        type="button"
        className={clsx(
          'rounded px-1 text-[9px] font-bold',
          isViceCaptain ? 'bg-fpl-cyan text-fpl-purple' : 'bg-white/20 text-white hover:bg-white/40',
          isCaptain && 'opacity-40',
        )}
        aria-label={`Make ${name} vice-captain`}
        disabled={isCaptain}
        onClick={(event) => {
          event.stopPropagation();
          onMakeVice?.();
        }}
      >
        V
      </button>
    </div>
  ) : null;

  const benchControls = showBenchControls ? (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center gap-0.5 bg-black/50 p-0.5">
      {onBenchUp ? (
        <button
          type="button"
          className="rounded px-1 text-[9px] font-bold text-white hover:bg-white/30"
          aria-label={`Move ${name} up the bench`}
          onClick={(event) => {
            event.stopPropagation();
            onBenchUp();
          }}
        >
          ↑
        </button>
      ) : null}
      {onBenchDown ? (
        <button
          type="button"
          className="rounded px-1 text-[9px] font-bold text-white hover:bg-white/30"
          aria-label={`Move ${name} down the bench`}
          onClick={(event) => {
            event.stopPropagation();
            onBenchDown();
          }}
        >
          ↓
        </button>
      ) : null}
    </div>
  ) : null;

  if (useShirtLayout) {
    const Wrapper =
      showArmbandControls || showBenchControls || showSwitchControl ? 'div' : 'button';
    const wrapperProps =
      Wrapper === 'button'
        ? {
            type: 'button' as const,
            onClick,
            disabled,
            'aria-label': ariaLabel,
          }
        : {
            role: 'group' as const,
            'aria-label': ariaLabel,
          };

    return (
      <Wrapper
        {...wrapperProps}
        className={clsx(
          'relative flex w-[4.9rem] flex-col overflow-hidden rounded-xl text-center transition transition-shadow hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 sm:w-[5.25rem]',
          builderMode && 'squad-builder-player-card',
          isEmpty && 'min-h-[6.5rem] border border-dashed border-white/30 bg-white/5 shadow-inner',
          !isEmpty && 'border border-black/10 bg-[#0d7a47]/45 shadow-md shadow-black/20',
          variant === 'active' &&
            !transferOut &&
            'ring-2 ring-fpl-cyan ring-offset-1 ring-offset-pitch-green',
          variant === 'active' && transferOut && 'ring-2 ring-fpl-pink ring-offset-1 ring-offset-pitch-green',
          pendingTransfer && 'ring-2 ring-fpl-cyan ring-offset-1 ring-offset-pitch-green',
          transferOut && 'border-2 border-dashed border-white/70',
          (dimmed || disabled) && 'opacity-50',
          onClick ? 'cursor-pointer' : 'cursor-default',
          className,
        )}
        {...(Wrapper === 'div' ? { onClick } : {})}
      >
        {switchControl}
        {pendingTransfer ? (
          <span className="transfer-swap-badge" aria-label="Pending transfer"><ArrowLeftRight aria-hidden="true" /></span>
        ) : null}

        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-1 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg font-light text-white/80">
              {transferOut ? <UserPlus className="h-4 w-4" /> : '+'}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/85">
              {position ? POSITION_LABELS[position] : 'ADD'}
            </span>
          </div>
        ) : (
          <>
            {badgeMode === 'price' && price !== undefined && !pendingTransfer ? (
              <div className="player-card-price-badge">
                {formatPrice(price)}
              </div>
            ) : null}
            <div className="player-card-shirt-stage">
              {armband ? <span className="player-card-armband" aria-label={armband === 'C' ? 'Captain' : 'Vice captain'}>{armband}</span> : null}
              {availabilityBadge ? <span className={clsx('player-card-status-badge', availabilityBadge.className)} aria-label={availabilityBadge.label} /> : null}
              <ShirtVisual shortName={shortName ?? name?.slice(0, 3).toUpperCase() ?? 'FPL'} position={position} clubId={clubId} />
            </div>
            <div className="player-card-name-panel">
              <div className="truncate text-[10px] font-bold leading-tight">
                {truncateName(name ?? '')}
              </div>
              <div className="truncate text-[9px] font-extrabold leading-tight text-fpl-purple/80">
                {displayText ??
                  (builderMode || points === null || points === undefined
                    ? position
                    : `${points}${showProvisional ? '*' : ''}`)}
              </div>
            </div>
          </>
        )}

        <AutoSubBadge wasSubstitutedIn={wasSubstitutedIn} wasSubstitutedOut={wasSubstitutedOut} />
        {armbandControls}
        {benchControls}
      </Wrapper>
    );
  }

  const useDivShell = showArmbandControls || showBenchControls || showSwitchControl;

  if (useDivShell) {
    return (
      <div
        role="group"
        aria-label={ariaLabel}
        onClick={onClick}
        className={clsx(
          'relative flex min-h-[7.5rem] w-[4.8rem] flex-col items-center justify-between gap-1 rounded-xl p-2 text-center transition transition-shadow hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 sm:min-h-[8rem] sm:w-[5.5rem]',
          isEmpty &&
            'border border-dashed border-white/25 bg-white/6 shadow-inner shadow-white/5 hover:border-fpl-green/50',
          variant === 'filled' &&
            'border border-white/15 bg-fpl-purple/85 shadow-lg shadow-black/20 hover:border-fpl-green/50',
          variant === 'active' &&
            transferOut &&
            'border-2 border-fpl-pink bg-fpl-purple ring-2 ring-fpl-pink/30',
          variant === 'active' &&
            !transferOut &&
            'border-2 border-fpl-cyan bg-fpl-purple ring-2 ring-fpl-cyan/30',
          pendingTransfer && 'border-2 border-fpl-cyan ring-2 ring-fpl-cyan/30',
          dimmed && 'opacity-50',
          onClick && 'cursor-pointer',
          !onClick && 'cursor-default',
          className,
        )}
      >
        {isCaptain ? (
          <span
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-fpl-pink text-[10px] font-bold text-white"
            aria-hidden="true"
          >
            C
          </span>
        ) : null}
        {switchControl}
        {pendingTransfer ? (
          <span className="transfer-swap-badge" aria-label="Pending transfer"><ArrowLeftRight aria-hidden="true" /></span>
        ) : null}
        {isViceCaptain ? (
          <span
            className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-fpl-cyan text-[10px] font-bold text-fpl-purple"
            aria-hidden="true"
          >
            V
          </span>
        ) : null}

        <div
          className={clsx(
            'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold sm:h-11 sm:w-11',
            isEmpty ? 'bg-white/12 text-white/70' : 'bg-fpl-green/20 text-fpl-green',
          )}
        >
          {isEmpty ? '+' : (shortName ?? name?.slice(0, 3).toUpperCase())}
        </div>

        {isEmpty ? (
          <div className="space-y-1">
            <span className="block text-[11px] font-semibold text-white/90">{position}</span>
            <span className="block text-[10px] text-white/55">Add player</span>
          </div>
        ) : (
          <>
            {badgeMode === 'price' && price !== undefined ? (
              <span
                className={clsx(
                  'text-[10px] font-semibold text-white/80',
                  transferOut && 'line-through text-fpl-pink',
                )}
              >
                {formatPrice(price)}
              </span>
            ) : null}
            {availabilityBadge ? <span className={clsx('player-card-status-badge is-default-card', availabilityBadge.className)} aria-label={availabilityBadge.label} /> : null}
            <span className="line-clamp-2 w-full text-[11px] font-medium leading-tight text-white">
              {name}
            </span>
            {points !== null && points !== undefined ? (
              <span className="text-xs font-bold text-fpl-green">
                {points}
                {showProvisional ? '*' : ''}
              </span>
            ) : null}
          </>
        )}

        <AutoSubBadge wasSubstitutedIn={wasSubstitutedIn} wasSubstitutedOut={wasSubstitutedOut} />
        {armbandControls}
        {benchControls}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={clsx(
        'relative flex min-h-[7.5rem] w-[4.8rem] flex-col items-center justify-between gap-1 rounded-xl p-2 text-center transition transition-shadow hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 sm:min-h-[8rem] sm:w-[5.5rem]',
        isEmpty &&
          'border border-dashed border-white/25 bg-white/6 shadow-inner shadow-white/5 hover:border-fpl-green/50',
        variant === 'filled' &&
          'border border-white/15 bg-fpl-purple/85 shadow-lg shadow-black/20 hover:border-fpl-green/50',
        variant === 'active' &&
          transferOut &&
          'border-2 border-fpl-pink bg-fpl-purple ring-2 ring-fpl-pink/30',
        variant === 'active' &&
          !transferOut &&
          'border-2 border-fpl-cyan bg-fpl-purple ring-2 ring-fpl-cyan/30',
        pendingTransfer && 'border-2 border-fpl-cyan ring-2 ring-fpl-cyan/30',
        (dimmed || disabled) && 'opacity-50',
        onClick && 'cursor-pointer',
        !onClick && 'cursor-default',
        className,
      )}
    >
      {isCaptain ? (
        <span
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-fpl-pink text-[10px] font-bold text-white"
          aria-hidden="true"
        >
          C
        </span>
      ) : null}
      {switchControl}
      {pendingTransfer ? (
        <span className="transfer-swap-badge" aria-label="Pending transfer"><ArrowLeftRight aria-hidden="true" /></span>
      ) : null}
      {isViceCaptain ? (
        <span
          className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-fpl-cyan text-[10px] font-bold text-fpl-purple"
          aria-hidden="true"
        >
          V
        </span>
      ) : null}

      <div
        className={clsx(
          'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold sm:h-11 sm:w-11',
          isEmpty ? 'bg-white/12 text-white/70' : 'bg-fpl-green/20 text-fpl-green',
        )}
      >
        {isEmpty ? '+' : (shortName ?? name?.slice(0, 3).toUpperCase())}
      </div>

      {isEmpty ? (
        <div className="space-y-1">
          <span className="block text-[11px] font-semibold text-white/90">{position}</span>
          <span className="block text-[10px] text-white/55">Add player</span>
        </div>
      ) : (
        <>
          {badgeMode === 'price' && price !== undefined ? (
            <span
              className={clsx(
                'text-[10px] font-semibold text-white/80',
                transferOut && 'line-through text-fpl-pink',
              )}
            >
              {formatPrice(price)}
            </span>
          ) : null}
          {availabilityBadge ? <span className={clsx('player-card-status-badge is-default-card', availabilityBadge.className)} aria-label={availabilityBadge.label} /> : null}
          <span className="line-clamp-2 w-full text-[11px] font-medium leading-tight text-white">
            {name}
          </span>
          {points !== null && points !== undefined ? (
            <span className="text-xs font-bold text-fpl-green">
              {points}
              {showProvisional ? '*' : ''}
            </span>
          ) : null}
        </>
      )}

      <AutoSubBadge wasSubstitutedIn={wasSubstitutedIn} wasSubstitutedOut={wasSubstitutedOut} />
    </button>
  );
}
