import {
  mapFplElement,
  mapFplEvent,
  mapFplFixture,
  mapFplLiveStats,
  mapFplTeam,
} from '../../src/modules/ingestion/mappers';
import type {
  FplBootstrapStatic,
  FplFixture,
  FplGameweekLive,
} from '../../src/modules/ingestion/fpl.types';

describe('ingestion mappers', () => {
  describe('mapFplTeam', () => {
    it('maps FPL team to RealTeam upsert shape', () => {
      expect(
        mapFplTeam({ id: 1, name: 'Arsenal', short_name: 'ARS' }),
      ).toEqual({
        fplId: 1,
        name: 'Arsenal',
        shortName: 'ARS',
        crestUrl: '/crests/ARS.webp',
      });
    });
  });

  describe('mapFplElement', () => {
    it('maps element_type to position and availability', () => {
      expect(
        mapFplElement({
          id: 100,
          web_name: 'Salah',
          first_name: 'Mohamed',
          second_name: 'Salah',
          element_type: 3,
          team: 14,
          now_cost: 145,
          status: 'a',
          chance_of_playing_next_round: 100,
          total_points: 180,
          event_points: 8,
          selected_by_percent: '25.4',
          minutes: 2500,
          goals_scored: 15,
          assists: 10,
          clean_sheets: 0,
          goals_conceded: 0,
          own_goals: 0,
          penalties_saved: 0,
        }),
      ).toEqual({
        fplId: 100,
        name: 'Salah',
        position: 'MID',
        price: 145,
        realTeamFplId: 14,
        isAvailable: true,
        availabilityStatus: 'a',
        chanceOfPlayingNextRound: 100,
        totalPoints: 180,
        eventPoints: 8,
        selectedByPercent: 25.4,
        minutes: 2500,
        goalsScored: 15,
        assists: 10,
        cleanSheets: 0,
        goalsConceded: 0,
        ownGoals: 0,
        penaltiesSaved: 0,
      });
    });

    it('marks doubtful players as available', () => {
      const result = mapFplElement({
        id: 101,
        web_name: 'Test',
        first_name: 'T',
        second_name: 'Player',
        element_type: 2,
        team: 1,
        now_cost: 50,
        status: 'd',
        total_points: 0,
        event_points: 0,
        selected_by_percent: '0.0',
        minutes: 0,
        goals_scored: 0,
        assists: 0,
        clean_sheets: 0,
        goals_conceded: 0,
        own_goals: 0,
        penalties_saved: 0,
      });
      expect(result.isAvailable).toBe(true);
      expect(result.availabilityStatus).toBe('d');
      expect(result.chanceOfPlayingNextRound).toBeNull();
    });

    it('marks injured players as unavailable', () => {
      const result = mapFplElement({
        id: 102,
        web_name: 'Injured',
        first_name: 'I',
        second_name: 'Player',
        element_type: 4,
        team: 1,
        now_cost: 60,
        status: 'i',
        total_points: 0,
        event_points: 0,
        selected_by_percent: '0.0',
        minutes: 0,
        goals_scored: 0,
        assists: 0,
        clean_sheets: 0,
        goals_conceded: 0,
        own_goals: 0,
        penalties_saved: 0,
      });
      expect(result.isAvailable).toBe(false);
      expect(result.availabilityStatus).toBe('i');
      expect(result.chanceOfPlayingNextRound).toBeNull();
    });

    it.each([
      ['d', 75, true],
      ['d', 25, true],
      ['i', 0, false],
      ['s', 0, false],
      ['u', null, false],
      ['n', null, false],
    ])('preserves availability status %s and chance %s', (status, chance, isAvailable) => {
      const result = mapFplElement({
        id: 200,
        web_name: 'Status',
        first_name: 'Status',
        second_name: 'Player',
        element_type: 2,
        team: 1,
        now_cost: 50,
        status,
        chance_of_playing_next_round: chance,
        total_points: 0,
        event_points: 0,
        selected_by_percent: '0',
        minutes: 0,
        goals_scored: 0,
        assists: 0,
        clean_sheets: 0,
        goals_conceded: 0,
        own_goals: 0,
        penalties_saved: 0,
      });
      expect(result).toMatchObject({
        availabilityStatus: status,
        chanceOfPlayingNextRound: chance,
        isAvailable,
      });
    });
  });

  describe('mapFplEvent', () => {
    it('maps finished event to FINISHED status', () => {
      expect(
        mapFplEvent({
          id: 1,
          name: 'Gameweek 1',
          deadline_time: '2025-08-15T17:30:00Z',
          finished: true,
          is_current: false,
          is_next: false,
        }),
      ).toEqual({
        number: 1,
        deadline: new Date('2025-08-15T17:30:00Z'),
        status: 'FINISHED',
        isCurrent: false,
      });
    });

    it('maps current event to LIVE status', () => {
      const result = mapFplEvent({
        id: 2,
        name: 'Gameweek 2',
        deadline_time: '2025-08-22T17:30:00Z',
        finished: false,
        is_current: true,
        is_next: false,
      });
      expect(result.status).toBe('LIVE');
      expect(result.isCurrent).toBe(true);
    });
  });

  describe('mapFplFixture', () => {
    it('maps fixture with FDR fields', () => {
      const fixture: FplFixture = {
        id: 10,
        event: 1,
        team_h: 1,
        team_a: 2,
        kickoff_time: '2025-08-16T14:00:00Z',
        finished: true,
        team_h_score: 2,
        team_a_score: 1,
        team_h_difficulty: 4,
        team_a_difficulty: 3,
      };

      expect(mapFplFixture(fixture)).toEqual({
        fplId: 10,
        gameweekNumber: 1,
        homeTeamFplId: 1,
        awayTeamFplId: 2,
        kickoffTime: new Date('2025-08-16T14:00:00Z'),
        homeScore: 2,
        awayScore: 1,
        homeDifficulty: 4,
        awayDifficulty: 3,
        finished: true,
        started: false,
        minutes: null,
      });
    });

    it('returns null when event is null', () => {
      expect(
        mapFplFixture({
          id: 11,
          event: null,
          team_h: 1,
          team_a: 2,
          kickoff_time: '2025-08-16T14:00:00Z',
          finished: false,
          team_h_score: null,
          team_a_score: null,
          team_h_difficulty: 2,
          team_a_difficulty: 2,
        }),
      ).toBeNull();
    });
  });

  describe('mapFplLiveStats', () => {
    it('maps live element stats', () => {
      const live: FplGameweekLive = {
        elements: [
          {
            id: 100,
            stats: {
              minutes: 90,
              goals_scored: 2,
              assists: 1,
              clean_sheets: 0,
              goals_conceded: 1,
              saves: 0,
              yellow_cards: 0,
              red_cards: 0,
              own_goals: 0,
              penalties_saved: 0,
              penalties_missed: 0,
              bps: 50,
              bonus: 3,
              total_points: 14,
            },
          },
        ],
      };

      expect(mapFplLiveStats(live, 1)).toEqual([
        {
          playerFplId: 100,
          gameweekNumber: 1,
          minutes: 90,
          goals: 2,
          assists: 1,
          cleanSheet: false,
          goalsConceded: 1,
          saves: 0,
          yellowCards: 0,
          redCards: 0,
          ownGoals: 0,
          penaltiesMissed: 0,
          penaltiesSaved: 0,
          bonus: 3,
          bps: 50,
          points: 14,
        },
      ]);
    });

    it('sets cleanSheet true when clean_sheets > 0', () => {
      const live: FplGameweekLive = {
        elements: [
          {
            id: 200,
            stats: {
              minutes: 90,
              goals_scored: 0,
              assists: 0,
              clean_sheets: 1,
              goals_conceded: 0,
              saves: 4,
              yellow_cards: 0,
              red_cards: 0,
              own_goals: 0,
              penalties_saved: 0,
              penalties_missed: 0,
              bps: 30,
              bonus: 0,
              total_points: 6,
            },
          },
        ],
      };

      expect(mapFplLiveStats(live, 2)[0].cleanSheet).toBe(true);
    });
  });
});
