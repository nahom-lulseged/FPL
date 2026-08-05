process.env.TELEGRAM_AUTH_ENABLED = 'true';
process.env.TELEGRAM_BOT_TOKEN = '123456789:test_token';
process.env.TELEGRAM_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.TERMS_URL = 'https://example.com/terms';

jest.mock('../../src/config/db', () => {
  const prisma: Record<string, unknown> = {
    authIdentity: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    telegramContactClaim: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    team: {
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
  return { prisma };
});

jest.mock('../../src/config/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('../../src/config/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp: jest.fn(),
    },
  },
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
        getUserById: jest.fn(),
        generateLink: jest.fn(),
      },
    },
  },
}));

import { AuthProvider } from '@prisma/client';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import { supabase, supabaseAdmin } from '../../src/config/supabase';
import {
  chooseExistingTelegramAccount,
  chooseNewTelegramAccount,
  handleTelegramContactShare,
  normalizeGlobalPhone,
  startTelegramAuthentication,
} from '../../src/modules/auth/telegramAuth.service';

const telegramUser = {
  id: 4242,
  first_name: 'Ada',
  last_name: 'Lovelace',
  username: 'ada',
  language_code: 'en',
};

function mockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    supabaseAuthId: 'auth-1',
    email: null,
    displayName: 'Ada',
    displayNameLower: 'ada',
    role: 'USER',
    isSuspended: false,
    suspendedAt: null,
    suspendedReason: null,
    termsAcceptedAt: null,
    ageVerifiedAt: null,
    kycVerifiedAt: null,
    kycDocumentRef: null,
    phoneE164: '+14155552671',
    contactSharedAt: new Date('2026-01-01T00:00:00Z'),
    contactTermsUrl: 'https://example.com/terms',
    locale: 'en',
    onboardingCompletedAt: null,
    referralCode: 'FPLTEST',
    badgeConfig: null,
    notificationPreferences: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function signedInitData(): string {
  const crypto = require('crypto') as typeof import('crypto');
  const token = '123456789:test_token';
  process.env.TELEGRAM_BOT_TOKEN = token;
  const authDate = Math.floor(Date.now() / 1000).toString();
  const params = new URLSearchParams({
    auth_date: authDate,
    user: JSON.stringify(telegramUser),
  });
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}

describe('Telegram contact onboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TELEGRAM_AUTH_ENABLED = 'true';
    process.env.TELEGRAM_BOT_TOKEN = '123456789:test_token';
    process.env.TERMS_URL = 'https://example.com/terms';
  });

  it('normalizes global phone numbers and rejects non-owned contacts', async () => {
    expect(normalizeGlobalPhone('+1 (415) 555-2671')).toBe('+14155552671');
    await expect(handleTelegramContactShare(telegramUser, 9999, '+14155552671')).rejects.toMatchObject({
      statusCode: 400,
      details: { code: 'CONTACT_OWNER_MISMATCH' },
    });
  });

  it('links a unique legacy phone match without creating a new Supabase user', async () => {
    (prisma.authIdentity.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.telegramContactClaim.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser()]);

    const result = await handleTelegramContactShare(telegramUser, telegramUser.id, '+1 415 555 2671');

    expect(result).toEqual({ status: 'ready', userId: 'user-1' });
    expect(prisma.authIdentity.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { provider_subject: { provider: AuthProvider.TELEGRAM, subject: String(telegramUser.id) } },
    }));
    expect(supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('asks unmatched contacts to choose new or existing account', async () => {
    (prisma.authIdentity.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.telegramContactClaim.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    await expect(handleTelegramContactShare(telegramUser, telegramUser.id, '+44 20 7946 0958')).resolves.toEqual({
      status: 'choose_account_type',
    });
    expect(redis.set).toHaveBeenCalledWith(expect.stringContaining('telegram:onboarding:contact'), expect.any(String), 'EX', expect.any(Number));
  });

  it('creates a support claim when a phone number matches multiple legacy users', async () => {
    (prisma.authIdentity.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.telegramContactClaim.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser({ id: 'user-1' }), mockUser({ id: 'user-2' })]);
    (prisma.telegramContactClaim.create as jest.Mock).mockResolvedValue({ id: 'claim-ambiguous' });

    await expect(handleTelegramContactShare(telegramUser, telegramUser.id, '+1 415 555 2671')).resolves.toEqual({
      status: 'support_claim_pending',
      claimId: 'claim-ambiguous',
    });
  });

  it('creates a new Telegram account after the new-user choice', async () => {
    (prisma.authIdentity.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.telegramContactClaim.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (redis.get as jest.Mock).mockResolvedValue(JSON.stringify({
      telegramUser,
      phoneE164: '+442079460958',
      contactSharedAt: '2026-01-01T00:00:00.000Z',
    }));
    (supabaseAdmin.auth.admin.createUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null });
    (prisma.user.create as jest.Mock).mockResolvedValue(mockUser());

    await expect(chooseNewTelegramAccount(telegramUser)).resolves.toEqual({ status: 'ready', userId: 'user-1' });
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: null,
        phoneE164: '+442079460958',
        authIdentities: expect.objectContaining({ create: expect.objectContaining({ provider: AuthProvider.TELEGRAM }) }),
      }),
    }));
  });

  it('creates a support claim for unmatched existing-account choices', async () => {
    (redis.get as jest.Mock).mockResolvedValue(JSON.stringify({
      telegramUser,
      phoneE164: '+442079460958',
      contactSharedAt: '2026-01-01T00:00:00.000Z',
    }));
    (prisma.telegramContactClaim.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.telegramContactClaim.create as jest.Mock).mockResolvedValue({ id: 'claim-1' });

    await expect(chooseExistingTelegramAccount(telegramUser)).resolves.toEqual({
      status: 'support_claim_pending',
      claimId: 'claim-1',
    });
  });

  it('blocks Mini App session exchange until contact confirmation exists', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    (prisma.authIdentity.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.telegramContactClaim.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(startTelegramAuthentication(signedInitData())).rejects.toMatchObject({
      statusCode: 403,
      details: { code: 'CONTACT_REQUIRED' },
    });
    jest.useRealTimers();
  });

  it('exchanges a contact-confirmed identity for a session and nextPath', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const user = mockUser();
    (prisma.authIdentity.findUnique as jest.Mock).mockResolvedValue({
      id: 'identity-1',
      userId: user.id,
      user,
    });
    (prisma.authIdentity.update as jest.Mock).mockResolvedValue({});
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockResolvedValue({ data: { user: { email: 'internal@auth.invalid' } } });
    (supabaseAdmin.auth.admin.generateLink as jest.Mock).mockResolvedValue({ data: { properties: { hashed_token: 'hash' } }, error: null });
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({ data: { session: { access_token: 'access', refresh_token: 'refresh' } }, error: null });
    (prisma.team.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(startTelegramAuthentication(signedInitData())).resolves.toMatchObject({
      status: 'authenticated',
      accessToken: 'access',
      refreshToken: 'refresh',
      nextPath: '/squad-selection',
      user: { id: user.id, email: null, displayName: 'Ada' },
    });
    jest.useRealTimers();
  });
});
