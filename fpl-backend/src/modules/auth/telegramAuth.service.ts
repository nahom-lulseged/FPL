import crypto from 'crypto';
import { AuthProvider, Prisma, TelegramContactClaimStatus, type TelegramContactClaim } from '@prisma/client';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { prisma } from '../../config/db';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { supabaseAdmin } from '../../config/supabase';
import { platformConfig } from '../../config/platformConfig';
import { AppError } from '../../middleware/errorHandler';
import { createApplicationUser, createSessionForUser } from './auth.service';
import { logAdminAction } from '../admin/audit/auditLog.service';

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;
const MAX_FUTURE_SKEW_SECONDS = 60;
const CONTACT_STATE_TTL_SECONDS = 30 * 60;

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

export type TelegramContactProfile = TelegramUser & {
  phone_number?: string;
};

export type TelegramVerificationResult = { valid: false } | { valid: true; user: TelegramUser };

type StoredContactState = {
  telegramUser: TelegramUser;
  phoneE164: string;
  contactSharedAt: string;
};

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

export function verifyTelegramInitData(initData: string, botToken: string): TelegramVerificationResult {
  if (!initData || !botToken) return { valid: false };

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  const authDate = Number(params.get('auth_date'));
  const userJson = params.get('user');
  if (!receivedHash || !Number.isSafeInteger(authDate) || !userJson) return { valid: false };

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (authDate < nowSeconds - MAX_AUTH_AGE_SECONDS || authDate > nowSeconds + MAX_FUTURE_SKEW_SECONDS) {
    return { valid: false };
  }

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (!safeEqualHex(receivedHash, expectedHash)) return { valid: false };

  try {
    const user = JSON.parse(userJson) as TelegramUser;
    if (!Number.isSafeInteger(user.id) || user.id <= 0 || typeof user.first_name !== 'string' || !user.first_name.trim()) {
      return { valid: false };
    }
    return { valid: true, user };
  } catch {
    return { valid: false };
  }
}

export function validateTelegramInitData(initData: string): TelegramUser {
  if (!env.TELEGRAM_AUTH_ENABLED || !env.TELEGRAM_BOT_TOKEN) {
    throw new AppError(503, 'Telegram authentication is not enabled');
  }
  const result = verifyTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
  if (!result.valid) throw new AppError(401, 'Invalid or expired Telegram authentication data', { code: 'INVALID_TELEGRAM_LAUNCH' });
  return result.user;
}

function contactStateKey(telegramId: string): string {
  return `telegram:onboarding:contact:${telegramId}`;
}

function telegramDisplayName(user: TelegramUser): string {
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim().slice(0, 80) || user.username || `Telegram ${user.id}`;
}

function telegramProviderData(user: TelegramUser): Prisma.InputJsonObject {
  return {
    id: user.id,
    first_name: user.first_name,
    ...(user.last_name ? { last_name: user.last_name } : {}),
    ...(user.language_code ? { language_code: user.language_code } : {}),
  };
}

export function normalizeGlobalPhone(phone: string): string {
  const trimmed = phone.trim();
  const candidate = trimmed.startsWith('+') ? trimmed : `+${trimmed.replace(/\D/g, '')}`;
  const parsed = parsePhoneNumberFromString(candidate);
  if (!parsed?.isValid()) throw new AppError(400, 'A valid phone number is required', { code: 'INVALID_PHONE' });
  return parsed.number;
}

async function storeContactState(state: StoredContactState): Promise<void> {
  await redis.set(contactStateKey(String(state.telegramUser.id)), JSON.stringify(state), 'EX', CONTACT_STATE_TTL_SECONDS);
}

async function loadContactState(telegramId: string): Promise<StoredContactState> {
  const raw = await redis.get(contactStateKey(telegramId));
  if (!raw) throw new AppError(409, 'Please share your Telegram contact again', { code: 'CONTACT_REQUIRED' });
  try {
    return JSON.parse(raw) as StoredContactState;
  } catch {
    await redis.del(contactStateKey(telegramId));
    throw new AppError(409, 'Please share your Telegram contact again', { code: 'CONTACT_REQUIRED' });
  }
}

async function findTelegramIdentity(subject: string) {
  return prisma.authIdentity.findUnique({
    where: { provider_subject: { provider: AuthProvider.TELEGRAM, subject } },
    include: { user: true },
  });
}

async function findPendingClaim(telegramId: string): Promise<TelegramContactClaim | null> {
  return prisma.telegramContactClaim.findFirst({
    where: { telegramId, status: TelegramContactClaimStatus.PENDING },
    orderBy: { createdAt: 'desc' },
  });
}

async function findPhoneUsers(phoneE164: string) {
  return prisma.user.findMany({
    where: { phoneE164 },
    take: 2,
  });
}

async function findUniquePhoneUser(phoneE164: string) {
  const matches = await findPhoneUsers(phoneE164);
  return matches.length === 1 ? matches[0] : null;
}

async function updateTelegramIdentityMetadata(userId: string, telegramUser: TelegramUser, phoneE164: string) {
  const now = new Date();
  const subject = String(telegramUser.id);
  const providerData = telegramProviderData(telegramUser);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        phoneE164,
        contactSharedAt: now,
        contactTermsUrl: env.TERMS_URL ?? null,
        locale: telegramUser.language_code ?? undefined,
      },
    });
    await tx.authIdentity.upsert({
      where: { provider_subject: { provider: AuthProvider.TELEGRAM, subject } },
      create: {
        userId,
        provider: AuthProvider.TELEGRAM,
        subject,
        username: telegramUser.username,
        photoUrl: telegramUser.photo_url,
        providerData,
        lastAuthenticatedAt: now,
      },
      update: {
        username: telegramUser.username,
        photoUrl: telegramUser.photo_url,
        providerData,
        lastAuthenticatedAt: now,
      },
    });
  });
}

async function createTelegramApplicationUser(state: StoredContactState) {
  const subject = String(state.telegramUser.id);
  const internalEmail = `telegram.${subject}.${crypto.randomBytes(12).toString('hex')}@auth.invalid`;
  const authResult = await supabaseAdmin.auth.admin.createUser({
    email: internalEmail,
    email_confirm: true,
    app_metadata: { auth_provider: 'telegram' },
  });
  if (authResult.error || !authResult.data.user) {
    throw new AppError(502, authResult.error?.message ?? 'Auth provider unavailable');
  }

  try {
    const user = await createApplicationUser({
      supabaseAuthId: authResult.data.user.id,
      email: null,
      displayName: telegramDisplayName(state.telegramUser),
      identity: {
        provider: AuthProvider.TELEGRAM,
        subject,
        username: state.telegramUser.username,
        photoUrl: state.telegramUser.photo_url,
        providerData: telegramProviderData(state.telegramUser),
      },
      additionalData: {
        phoneE164: state.phoneE164,
        contactSharedAt: new Date(state.contactSharedAt),
        contactTermsUrl: env.TERMS_URL ?? null,
        locale: state.telegramUser.language_code ?? 'en',
        referralCode: `FPL${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        badgeConfig: { templateId: 'elite-shield', icon: 'shield', primaryColor: '#00C853', accentColor: '#00D9FF' },
        notificationPreferences: { deadline: true, wallet: true, league: true, winners: true, telegram: true },
        wallets: { create: { walletType: 'USER', currency: platformConfig.currency, balanceMinor: 0 } },
      },
    });
    return user;
  } catch (cause) {
    await supabaseAdmin.auth.admin.deleteUser(authResult.data.user.id).catch(() => undefined);
    const racedIdentity = await findTelegramIdentity(subject);
    if (racedIdentity) return racedIdentity.user;
    throw cause;
  }
}

export type ContactOnboardingResult =
  | { status: 'ready'; userId: string }
  | { status: 'choose_account_type' }
  | { status: 'support_claim_pending'; claimId: string };

export async function getTelegramStartState(telegramUser: TelegramUser): Promise<ContactOnboardingResult | { status: 'contact_required' }> {
  const subject = String(telegramUser.id);
  const existing = await findTelegramIdentity(subject);
  if (existing?.user.contactSharedAt && existing.user.phoneE164) return { status: 'ready', userId: existing.userId };
  const pendingClaim = await findPendingClaim(subject);
  if (pendingClaim) return { status: 'support_claim_pending', claimId: pendingClaim.id };
  return { status: 'contact_required' };
}

export async function handleTelegramContactShare(telegramUser: TelegramUser, contactUserId: number, phone: string): Promise<ContactOnboardingResult> {
  if (contactUserId !== telegramUser.id) {
    throw new AppError(400, 'Shared contact must belong to the sender', { code: 'CONTACT_OWNER_MISMATCH' });
  }

  const subject = String(telegramUser.id);
  const phoneE164 = normalizeGlobalPhone(phone);
  const existing = await findTelegramIdentity(subject);

  if (existing) {
    await updateTelegramIdentityMetadata(existing.userId, telegramUser, phoneE164);
    return { status: 'ready', userId: existing.userId };
  }

  const pendingClaim = await findPendingClaim(subject);
  if (pendingClaim) return { status: 'support_claim_pending', claimId: pendingClaim.id };

  const uniquePhoneUser = await findUniquePhoneUser(phoneE164);
  if (uniquePhoneUser) {
    await updateTelegramIdentityMetadata(uniquePhoneUser.id, telegramUser, phoneE164);
    return { status: 'ready', userId: uniquePhoneUser.id };
  }

  const ambiguousMatches = await findPhoneUsers(phoneE164);
  if (ambiguousMatches.length > 1) {
    const claim = await createPendingContactClaim(telegramUser, phoneE164, 'Multiple legacy users share this phone number.');
    return { status: 'support_claim_pending', claimId: claim.id };
  }

  await storeContactState({
    telegramUser,
    phoneE164,
    contactSharedAt: new Date().toISOString(),
  });
  return { status: 'choose_account_type' };
}

export async function chooseNewTelegramAccount(telegramUser: TelegramUser): Promise<ContactOnboardingResult> {
  const subject = String(telegramUser.id);
  const existing = await findTelegramIdentity(subject);
  if (existing) return { status: 'ready', userId: existing.userId };

  const pendingClaim = await findPendingClaim(subject);
  if (pendingClaim) return { status: 'support_claim_pending', claimId: pendingClaim.id };

  const state = await loadContactState(subject);
  const uniquePhoneUser = await findUniquePhoneUser(state.phoneE164);
  if (uniquePhoneUser) {
    await updateTelegramIdentityMetadata(uniquePhoneUser.id, state.telegramUser, state.phoneE164);
    await redis.del(contactStateKey(subject));
    return { status: 'ready', userId: uniquePhoneUser.id };
  }

  const ambiguousMatches = await findPhoneUsers(state.phoneE164);
  if (ambiguousMatches.length > 0) {
    const claim = await createPendingContactClaim(state.telegramUser, state.phoneE164, 'Phone match became ambiguous before new-user provisioning.');
    await redis.del(contactStateKey(subject));
    return { status: 'support_claim_pending', claimId: claim.id };
  }

  const user = await createTelegramApplicationUser(state);
  await redis.del(contactStateKey(subject));
  return { status: 'ready', userId: user.id };
}

export async function chooseExistingTelegramAccount(telegramUser: TelegramUser): Promise<ContactOnboardingResult> {
  const subject = String(telegramUser.id);
  const state = await loadContactState(subject);
  const existingClaim = await findPendingClaim(subject);
  if (existingClaim) return { status: 'support_claim_pending', claimId: existingClaim.id };

  const claim = await createPendingContactClaim(
    state.telegramUser,
    state.phoneE164,
    'User reported an existing account but no unique phone match was available.',
  );
  await redis.del(contactStateKey(subject));
  return { status: 'support_claim_pending', claimId: claim.id };
}

async function createPendingContactClaim(telegramUser: TelegramUser, phoneE164: string, supportNote: string) {
  return prisma.telegramContactClaim.create({
    data: {
      telegramId: String(telegramUser.id),
      telegramUsername: telegramUser.username,
      displayName: telegramDisplayName(telegramUser),
      phoneE164,
      status: TelegramContactClaimStatus.PENDING,
      supportNote,
    },
  });
}

async function resolveNextPath(userId: string): Promise<'/home' | '/squad-selection'> {
  const team = await prisma.team.findFirst({
    where: { userId },
    select: { id: true },
  });
  return team ? '/home' : '/squad-selection';
}

export async function startTelegramAuthentication(initData: string) {
  const telegramUser = validateTelegramInitData(initData);
  const subject = String(telegramUser.id);
  const existing = await findTelegramIdentity(subject);

  if (!existing) {
    const pendingClaim = await findPendingClaim(subject);
    if (pendingClaim) throw new AppError(409, 'Support is reviewing your account link', { code: 'SUPPORT_CLAIM_PENDING' });
    throw new AppError(403, 'Please share your contact with @FantasyEtBot before opening the Mini App', { code: 'CONTACT_REQUIRED' });
  }

  if (!existing.user.contactSharedAt || !existing.user.phoneE164) {
    throw new AppError(403, 'Please share your contact with @FantasyEtBot before opening the Mini App', { code: 'CONTACT_REQUIRED' });
  }

  await prisma.authIdentity.update({
    where: { id: existing.id },
    data: {
      username: telegramUser.username,
      photoUrl: telegramUser.photo_url,
      lastAuthenticatedAt: new Date(),
      providerData: telegramProviderData(telegramUser),
    },
  });
  const session = await createSessionForUser(existing.userId);
  return { status: 'authenticated' as const, ...session, nextPath: await resolveNextPath(existing.userId) };
}

export async function listTelegramContactClaims() {
  const claims = await prisma.telegramContactClaim.findMany({
    where: { status: TelegramContactClaimStatus.PENDING },
    orderBy: { createdAt: 'asc' },
  });
  return {
    data: claims.map((claim) => ({
      id: claim.id,
      telegramId: claim.telegramId,
      telegramUsername: claim.telegramUsername,
      displayName: claim.displayName,
      phoneE164: claim.phoneE164,
      supportNote: claim.supportNote,
      createdAt: claim.createdAt.toISOString(),
    })),
  };
}

export async function resolveTelegramContactClaim(claimId: string, targetUserId: string, adminId: string) {
  const claim = await prisma.telegramContactClaim.findUnique({ where: { id: claimId } });
  if (!claim || claim.status !== TelegramContactClaimStatus.PENDING) throw new AppError(404, 'Pending claim not found');

  const [targetUser, conflictingIdentity, alreadyLinkedUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: targetUserId } }),
    findTelegramIdentity(claim.telegramId),
    prisma.authIdentity.findFirst({ where: { userId: targetUserId, provider: AuthProvider.TELEGRAM } }),
  ]);

  if (!targetUser) throw new AppError(404, 'Target user not found');
  if (targetUser.isSuspended) throw new AppError(409, 'Cannot resolve a claim to a suspended user');
  if (conflictingIdentity && conflictingIdentity.userId !== targetUserId) throw new AppError(409, 'Telegram identity is already linked to another user');
  if (alreadyLinkedUser && alreadyLinkedUser.subject !== claim.telegramId) throw new AppError(409, 'Target user already has another Telegram identity');

  const before = {
    id: claim.id,
    status: claim.status,
    telegramId: claim.telegramId,
    phoneE164: claim.phoneE164,
    resolvedToUserId: claim.resolvedToUserId,
  };

  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        phoneE164: claim.phoneE164,
        contactSharedAt: new Date(),
        contactTermsUrl: env.TERMS_URL ?? null,
      },
    });
    await tx.authIdentity.upsert({
      where: { provider_subject: { provider: AuthProvider.TELEGRAM, subject: claim.telegramId } },
      create: {
        userId: targetUserId,
        provider: AuthProvider.TELEGRAM,
        subject: claim.telegramId,
        username: claim.telegramUsername,
        providerData: { source: 'admin_claim_resolution' },
        lastAuthenticatedAt: new Date(),
      },
      update: {
        userId: targetUserId,
        username: claim.telegramUsername,
        lastAuthenticatedAt: new Date(),
      },
    });
    const resolved = await tx.telegramContactClaim.update({
      where: { id: claimId },
      data: {
        status: TelegramContactClaimStatus.RESOLVED,
        resolvedToUserId: targetUserId,
        resolvedByAdminId: adminId,
        resolvedAt: new Date(),
      },
    });
    await logAdminAction({
      tx,
      adminId,
      action: 'TELEGRAM_CONTACT_CLAIM_RESOLVE',
      targetType: 'TelegramContactClaim',
      targetId: claimId,
      before,
      after: {
        id: resolved.id,
        status: resolved.status,
        telegramId: resolved.telegramId,
        phoneE164: resolved.phoneE164,
        resolvedToUserId: resolved.resolvedToUserId,
      },
    });
    return resolved;
  });

  return {
    id: result.id,
    status: result.status,
    resolvedToUserId: result.resolvedToUserId,
    resolvedAt: result.resolvedAt?.toISOString() ?? null,
  };
}
