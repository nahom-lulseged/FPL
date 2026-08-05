import { env } from '../../config/env';

export type AdvancedMatchData = {
  possession?: { home: number; away: number };
  shots?: { home: number; away: number };
  corners?: { home: number; away: number };
  cards?: { home: number; away: number };
  expectedGoals?: { home: number; away: number };
  timeline?: Array<{ minute: number; type: string; team: 'HOME' | 'AWAY'; label: string }>;
};

export interface LiveMatchProvider {
  getAdvancedData(fixtureId: string): Promise<{
    data: AdvancedMatchData | null;
    completeness: 'BASIC' | 'PARTIAL' | 'COMPLETE' | 'UNAVAILABLE';
  }>;
}

const fplOnlyProvider: LiveMatchProvider = {
  async getAdvancedData() {
    return { data: null, completeness: 'BASIC' };
  },
};

export function getLiveMatchProvider(): LiveMatchProvider {
  // A licensed advanced-statistics adapter can replace this provider without
  // changing the public fixture contract. Until then, never fabricate fields.
  if (!env.ADVANCED_MATCH_DATA_ENABLED) return fplOnlyProvider;
  return fplOnlyProvider;
}
