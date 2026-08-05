import {
  canCreateLeagueType,
  generateInviteCode,
  joinErrorMessage,
  rankClassicStandings,
} from '../../src/modules/leagues/leagues.rules';
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from '../../src/lib/constants';

describe('leagues.rules', () => {
  describe('generateInviteCode', () => {
    it('returns a code of the configured length', () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(INVITE_CODE_LENGTH);
    });

    it('uses only characters from the invite alphabet', () => {
      const code = generateInviteCode();
      for (const char of code) {
        expect(INVITE_CODE_ALPHABET).toContain(char);
      }
    });
  });

  describe('canCreateLeagueType', () => {
    it('allows CLASSIC leagues', () => {
      expect(canCreateLeagueType('CLASSIC')).toBe(true);
    });

    it('rejects HEAD_TO_HEAD leagues in Phase 7', () => {
      expect(canCreateLeagueType('HEAD_TO_HEAD')).toBe(false);
    });
  });

  describe('joinErrorMessage', () => {
    it('returns human-readable messages', () => {
      expect(joinErrorMessage('LEAGUE_NOT_FOUND')).toContain('not found');
      expect(joinErrorMessage('ALREADY_MEMBER')).toContain('already a member');
    });
  });

  describe('rankClassicStandings', () => {
    it('sorts by total points descending then manager name', () => {
      const ranked = rankClassicStandings([
        {
          userId: 'u2',
          teamId: 't2',
          teamName: 'B Team',
          managerName: 'Bob',
          totalPoints: 100,
          gameweekPoints: 50,
          chipsUsed: [],
        },
        {
          userId: 'u1',
          teamId: 't1',
          teamName: 'A Team',
          managerName: 'Alice',
          totalPoints: 120,
          gameweekPoints: 60,
          chipsUsed: [],
        },
      ]);

      expect(ranked[0].teamId).toBe('t1');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(2);
    });

    it('assigns shared ranks for tied total points', () => {
      const ranked = rankClassicStandings([
        {
          userId: 'u1',
          teamId: 't1',
          teamName: 'A',
          managerName: 'Alice',
          totalPoints: 100,
          gameweekPoints: null,
          chipsUsed: [],
        },
        {
          userId: 'u2',
          teamId: 't2',
          teamName: 'B',
          managerName: 'Bob',
          totalPoints: 100,
          gameweekPoints: null,
          chipsUsed: [],
        },
        {
          userId: 'u3',
          teamId: 't3',
          teamName: 'C',
          managerName: 'Carol',
          totalPoints: 90,
          gameweekPoints: null,
          chipsUsed: [],
        },
      ]);

      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(1);
      expect(ranked[2].rank).toBe(3);
    });
  });
});
