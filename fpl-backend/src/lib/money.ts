/** Currency-safe arithmetic — all amounts in integer minor units (e.g. santim). */

export function toMinor(major: number): number {
  if (!Number.isFinite(major)) {
    throw new Error('Invalid amount');
  }
  return Math.round(major * 100);
}

export function fromMinor(minor: number): number {
  return minor / 100;
}

export function formatMinor(minor: number, currency = 'ETB'): string {
  const major = fromMinor(minor);
  return `${currency} ${major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function add(...amounts: number[]): number {
  return amounts.reduce((sum, a) => sum + a, 0);
}

export function subtract(a: number, b: number): number {
  return a - b;
}

/** Compute percent of amount using basis points (100 bps = 1%). */
export function percentOf(amountMinor: number, bps: number): number {
  return Math.floor((amountMinor * bps) / 10_000);
}

export function assertPositiveMinor(amountMinor: number, label = 'amount'): void {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error(`${label} must be a positive integer minor unit`);
  }
}

export function assertNonNegativeMinor(amountMinor: number, label = 'amount'): void {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new Error(`${label} must be a non-negative integer minor unit`);
  }
}
