import { rankClassicStandings } from '../../src/modules/leagues/standings.calculator';

describe('standings.calculator', () => {
  it('returns an empty array for an empty league', () => {
    expect(rankClassicStandings([])).toEqual([]);
  });

  it('preserves chip usage on ranked rows', () => {
    const ranked = rankClassicStandings([
      {
        userId: 'u1',
        teamId: 't1',
        teamName: 'Team',
        managerName: 'Alice',
        totalPoints: 50,
        gameweekPoints: 50,
        chipsUsed: [{ chipType: 'BENCH_BOOST', gameweekNumber: 2 }],
      },
    ]);

    expect(ranked[0].chipsUsed).toEqual([
      { chipType: 'BENCH_BOOST', gameweekNumber: 2 },
    ]);
  });
});
