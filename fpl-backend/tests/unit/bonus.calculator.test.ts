import {
  calculateFixtureBonus,
  calculateProvisionalBonusForFixture,
  calculateProvisionalBonusForGameweek,
} from '../../src/modules/scoring/bonus.calculator';

describe('bonus.calculator', () => {
  it('awards 3/2/1 bonus to top three BPS in a fixture', () => {
    const bonus = calculateProvisionalBonusForFixture([
      { playerId: 'a', realTeamId: 't1', bps: 50, bonus: 0 },
      { playerId: 'b', realTeamId: 't1', bps: 40, bonus: 0 },
      { playerId: 'c', realTeamId: 't2', bps: 30, bonus: 0 },
      { playerId: 'd', realTeamId: 't2', bps: 10, bonus: 0 },
    ]);

    expect(bonus.get('a')).toBe(3);
    expect(bonus.get('b')).toBe(2);
    expect(bonus.get('c')).toBe(1);
    expect(bonus.get('d')).toBeUndefined();
  });

  it('splits bonus when players tie for positions', () => {
    const bonusByIndex = calculateFixtureBonus([50, 50, 30]);
    expect(bonusByIndex.get(0)).toBe(2.5);
    expect(bonusByIndex.get(1)).toBe(2.5);
    expect(bonusByIndex.get(2)).toBe(1);
  });

  it('ignores players with confirmed bonus or zero BPS', () => {
    const bonus = calculateProvisionalBonusForFixture([
      { playerId: 'a', realTeamId: 't1', bps: 50, bonus: 3 },
      { playerId: 'b', realTeamId: 't1', bps: 40, bonus: 0 },
      { playerId: 'c', realTeamId: 't2', bps: 0, bonus: 0 },
    ]);

    expect(bonus.get('a')).toBeUndefined();
    expect(bonus.get('b')).toBe(3);
    expect(bonus.get('c')).toBeUndefined();
  });

  it('isolates bonus calculation per fixture', () => {
    const bonus = calculateProvisionalBonusForGameweek(
      [
        { id: 'f1', homeTeamId: 'home1', awayTeamId: 'away1' },
        { id: 'f2', homeTeamId: 'home2', awayTeamId: 'away2' },
      ],
      [
        { playerId: 'h1', realTeamId: 'home1', bps: 20, bonus: 0 },
        { playerId: 'a1', realTeamId: 'away1', bps: 10, bonus: 0 },
        { playerId: 'h2', realTeamId: 'home2', bps: 5, bonus: 0 },
        { playerId: 'a2', realTeamId: 'away2', bps: 15, bonus: 0 },
      ],
    );

    expect(bonus.get('h1')).toBe(3);
    expect(bonus.get('a1')).toBe(2);
    expect(bonus.get('a2')).toBe(3);
    expect(bonus.get('h2')).toBe(2);
  });
});
