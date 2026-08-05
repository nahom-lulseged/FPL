import { platformConfig } from '../../src/config/platformConfig';

describe('platformConfig', () => {
  it('exposes finance limits for soft launch', () => {
    expect(platformConfig.currency).toBeTruthy();
    expect(platformConfig.maxStakeMinor).toBeGreaterThan(0);
    expect(platformConfig.maxPotMinor).toBeGreaterThan(platformConfig.maxStakeMinor);
    expect(platformConfig.supportContactEmail).toContain('@');
  });
});
