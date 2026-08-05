import {
  calculateTransferHit,
  deductFreeTransfers,
  rolloverFreeTransfers,
} from '../../src/modules/transfers/transfers.rules';

describe('transfers.rules', () => {
  describe('calculateTransferHit', () => {
    it('returns 0 when transfers are within free allowance', () => {
      expect(calculateTransferHit(1, 1)).toBe(0);
      expect(calculateTransferHit(2, 2)).toBe(0);
    });

    it('returns -4 per transfer beyond free allowance', () => {
      expect(calculateTransferHit(2, 1)).toBe(4);
      expect(calculateTransferHit(3, 0)).toBe(12);
    });

    it('returns 0 when wildcard is active', () => {
      expect(calculateTransferHit(5, 0, true)).toBe(0);
    });
  });

  describe('deductFreeTransfers', () => {
    it('deducts transfers from free allowance', () => {
      expect(deductFreeTransfers(2, 1)).toBe(1);
      expect(deductFreeTransfers(1, 2)).toBe(0);
    });

    it('does not go below 0', () => {
      expect(deductFreeTransfers(0, 3)).toBe(0);
    });

    it('skips deduction when wildcard is active', () => {
      expect(deductFreeTransfers(2, 3, true)).toBe(2);
    });
  });

  describe('rolloverFreeTransfers', () => {
    it('adds 1 free transfer', () => {
      expect(rolloverFreeTransfers(0)).toBe(1);
      expect(rolloverFreeTransfers(1)).toBe(2);
    });

    it('caps at 2 free transfers', () => {
      expect(rolloverFreeTransfers(2)).toBe(2);
    });
  });
});
