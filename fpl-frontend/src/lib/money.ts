export function formatMinor(minor: number, currency = 'ETB'): string {
  const major = minor / 100;
  return `${currency} ${major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function majorToMinor(major: number): number {
  return Math.round(major * 100);
}
