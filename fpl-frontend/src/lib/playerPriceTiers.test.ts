import { describe, expect, it } from 'vitest';
import {
  buildPriceTierOptions,
  getDefaultPriceTierValue,
  getPriceTierTriggerLabel,
  resolvePriceTierFilters,
} from '@/lib/playerPriceTiers';

describe('playerPriceTiers', () => {
  const bounds = { min: 40, max: 100, q1: 50, q2: 70, q3: 85 };

  it('includes affordable then descending £0.5m ladder', () => {
    const options = buildPriceTierOptions(bounds, 600);
    expect(options[0]).toMatchObject({
      value: 'affordable',
      label: 'Affordable',
      maxPrice: 600,
    });
    expect(options[0]?.triggerLabel).toBe('Affordable (£60.0m)');

    const ladder = options.filter((option) => option.value.startsWith('max-'));
    expect(ladder[0]).toEqual({ value: 'max-100', label: '£10.0m', maxPrice: 100 });
    expect(ladder.map((option) => option.maxPrice)).toEqual([100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40]);
  });

  it('omits affordable when remaining budget is 0', () => {
    const options = buildPriceTierOptions(bounds, 0);
    expect(options.every((option) => option.value !== 'affordable')).toBe(true);
    expect(options[0]?.value).toBe('max-100');
  });

  it('defaults to highest max price', () => {
    expect(getDefaultPriceTierValue(bounds)).toBe('max-100');
    expect(getDefaultPriceTierValue(undefined)).toBeNull();
  });

  it('resolves affordable tier to maxPrice', () => {
    const options = buildPriceTierOptions(bounds, 500);
    expect(resolvePriceTierFilters('affordable', options, bounds)).toEqual({ maxPrice: 500 });
  });

  it('treats max ladder step as no filter', () => {
    const options = buildPriceTierOptions(bounds, 500);
    expect(resolvePriceTierFilters('max-100', options, bounds)).toEqual({});
  });

  it('resolves lower max steps to maxPrice', () => {
    const options = buildPriceTierOptions(bounds, 500);
    expect(resolvePriceTierFilters('max-70', options, bounds)).toEqual({ maxPrice: 70 });
  });

  it('builds trigger labels for affordable and max tiers', () => {
    const options = buildPriceTierOptions(bounds, 45);
    expect(getPriceTierTriggerLabel('affordable', options, bounds)).toBe('Affordable (£4.5m)');
    expect(getPriceTierTriggerLabel('max-100', options, bounds)).toBe('£10.0m');
    expect(getPriceTierTriggerLabel(null, options, bounds)).toBe('£10.0m');
  });
});
