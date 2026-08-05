import { formatPrice } from '@/lib/formatters';
import type { PriceBounds } from '@/types/player';

export type PriceTierValue = 'affordable' | `max-${number}`;

export interface PriceTierOption {
  value: PriceTierValue;
  /** Menu list label */
  label: string;
  /** Trigger button label (defaults to label) */
  triggerLabel?: string;
  minPrice?: number;
  maxPrice?: number;
}

const STEP = 5; // £0.5m in tenths

export function buildPriceTierOptions(
  bounds: PriceBounds | undefined,
  remainingBudget: number,
): PriceTierOption[] {
  const options: PriceTierOption[] = [];

  if (remainingBudget > 0) {
    options.push({
      value: 'affordable',
      label: 'Affordable',
      triggerLabel: `Affordable (${formatPrice(remainingBudget)})`,
      maxPrice: remainingBudget,
    });
  }

  if (!bounds || bounds.max <= 0) {
    return options;
  }

  const min = bounds.min;
  const max = bounds.max;

  for (let price = max; price >= min; price -= STEP) {
    options.push({
      value: `max-${price}`,
      label: formatPrice(price),
      maxPrice: price,
    });
  }

  const last = options[options.length - 1];
  if (last?.value !== `max-${min}` && min < max) {
    options.push({
      value: `max-${min}`,
      label: formatPrice(min),
      maxPrice: min,
    });
  }

  return options;
}

/** Default tier = highest max price (effectively no filter). */
export function getDefaultPriceTierValue(
  bounds: PriceBounds | undefined,
): PriceTierValue | null {
  if (!bounds || bounds.max <= 0) {
    return null;
  }
  return `max-${bounds.max}`;
}

export function resolvePriceTierFilters(
  tierValue: PriceTierValue | null,
  options: PriceTierOption[],
  bounds?: PriceBounds,
): { minPrice?: number; maxPrice?: number } {
  if (!tierValue) {
    return {};
  }

  if (tierValue === 'affordable') {
    const selected = options.find((option) => option.value === 'affordable');
    return selected?.maxPrice !== undefined ? { maxPrice: selected.maxPrice } : {};
  }

  const selected = options.find((option) => option.value === tierValue);
  const maxPrice =
    selected?.maxPrice ??
    (tierValue.startsWith('max-') ? Number(tierValue.slice(4)) : undefined);

  if (maxPrice === undefined || !Number.isFinite(maxPrice)) {
    return {};
  }

  // Highest ladder step equals global max → no effective filter
  if (bounds && maxPrice >= bounds.max) {
    return {};
  }

  return { maxPrice };
}

export function getPriceTierTriggerLabel(
  tierValue: PriceTierValue | null,
  options: PriceTierOption[],
  bounds?: PriceBounds,
): string {
  if (!tierValue) {
    return bounds?.max ? formatPrice(bounds.max) : 'Price';
  }
  const selected = options.find((option) => option.value === tierValue);
  if (selected) {
    return selected.triggerLabel ?? selected.label;
  }
  if (tierValue.startsWith('max-')) {
    const parsed = Number(tierValue.slice(4));
    if (Number.isFinite(parsed)) {
      return formatPrice(parsed);
    }
  }
  return 'Price';
}
