import { toMinor, fromMinor, add, subtract, percentOf, assertPositiveMinor } from '../../src/lib/money';

describe('money', () => {
  it('converts major to minor units', () => {
    expect(toMinor(10.5)).toBe(1050);
    expect(toMinor(10)).toBe(1000);
  });

  it('converts minor to major units', () => {
    expect(fromMinor(1050)).toBe(10.5);
  });

  it('adds amounts', () => {
    expect(add(100, 200, 300)).toBe(600);
  });

  it('subtracts amounts', () => {
    expect(subtract(500, 200)).toBe(300);
  });

  it('computes percent using basis points', () => {
    expect(percentOf(10_000, 1000)).toBe(1000);
    expect(percentOf(10_000, 5000)).toBe(5000);
  });

  it('rejects non-positive minor amounts', () => {
    expect(() => assertPositiveMinor(0)).toThrow();
    expect(() => assertPositiveMinor(-1)).toThrow();
  });
});
