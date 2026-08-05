import { redis } from '../../../config/redis';
import { AppError } from '../../../middleware/errorHandler';

const FAILURE_KEY_PREFIX = 'admin:login:failures:';
const LOCKOUT_KEY_PREFIX = 'admin:lockout:';
const LOCKOUT_WINDOW_SECONDS = 15 * 60;
const MAX_FAILURES = 3;

function failureKey(email: string): string {
  return `${FAILURE_KEY_PREFIX}${email.toLowerCase()}`;
}

function lockoutKey(email: string): string {
  return `${LOCKOUT_KEY_PREFIX}${email.toLowerCase()}`;
}

export async function assertAdminNotLocked(email: string): Promise<void> {
  const unlockAt = await redis.get(lockoutKey(email));

  if (unlockAt) {
    throw new AppError(423, 'Account temporarily locked due to repeated failed login attempts', {
      unlockAt,
    });
  }
}

export async function recordAdminLoginFailure(email: string): Promise<{ unlockAt?: string }> {
  const key = failureKey(email);
  const failures = await redis.incr(key);

  if (failures === 1) {
    await redis.expire(key, LOCKOUT_WINDOW_SECONDS);
  }

  if (failures >= MAX_FAILURES) {
    const unlockAt = new Date(Date.now() + LOCKOUT_WINDOW_SECONDS * 1000).toISOString();
    await redis.set(lockoutKey(email), unlockAt, 'EX', LOCKOUT_WINDOW_SECONDS);
    await redis.del(key);
    return { unlockAt };
  }

  return {};
}

export async function clearAdminLoginFailures(email: string): Promise<void> {
  await redis.del(failureKey(email));
  await redis.del(lockoutKey(email));
}

export async function clearAdminLockoutForTests(email: string): Promise<void> {
  await clearAdminLoginFailures(email);
}
