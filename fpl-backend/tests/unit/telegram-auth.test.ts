import crypto from 'crypto';
import { verifyTelegramInitData } from '../../src/modules/auth/telegramAuth.service';

const TOKEN = '123456789:TEST_TELEGRAM_BOT_TOKEN';
const KNOWN_GOOD = 'auth_date=1700000000&query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A42424242%2C%22first_name%22%3A%22Ada%22%2C%22last_name%22%3A%22Lovelace%22%2C%22username%22%3A%22ada%22%7D&hash=8a6a9e6b673e9bb6f74805fb5bd608d6e4a72cd913bc8b9ddc160c9cfb31e7cb';

function signed(fields: Record<string, string>): string {
  const params = new URLSearchParams(fields);
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}

describe('verifyTelegramInitData', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2023-11-14T22:14:00Z')));
  afterEach(() => jest.useRealTimers());

  it('accepts a known-good signed payload', () => {
    expect(verifyTelegramInitData(KNOWN_GOOD, TOKEN)).toEqual({
      valid: true,
      user: { id: 42424242, first_name: 'Ada', last_name: 'Lovelace', username: 'ada' },
    });
  });

  it('rejects tampering and malformed hashes', () => {
    expect(verifyTelegramInitData(KNOWN_GOOD.replace('Ada', 'Eve'), TOKEN)).toEqual({ valid: false });
    expect(verifyTelegramInitData(KNOWN_GOOD.replace(/hash=[^&]+/, 'hash=abcd'), TOKEN)).toEqual({ valid: false });
    expect(verifyTelegramInitData(KNOWN_GOOD.replace(/&hash=[^&]+/, ''), TOKEN)).toEqual({ valid: false });
  });

  it('rejects invalid user JSON even with a valid signature', () => {
    expect(verifyTelegramInitData(signed({ auth_date: '1700000000', user: '{bad json' }), TOKEN)).toEqual({ valid: false });
  });

  it('rejects stale and future payloads', () => {
    expect(verifyTelegramInitData(signed({ auth_date: '1699910000', user: JSON.stringify({ id: 1, first_name: 'Old' }) }), TOKEN)).toEqual({ valid: false });
    expect(verifyTelegramInitData(signed({ auth_date: '1700000200', user: JSON.stringify({ id: 1, first_name: 'Future' }) }), TOKEN)).toEqual({ valid: false });
  });
});
