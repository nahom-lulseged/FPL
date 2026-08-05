import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';

const badgeSchema = z.object({
  templateId: z.string().trim().min(1).max(40),
  icon: z.enum(['shield', 'crown', 'flame', 'bolt', 'star', 'trophy']),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i),
});
const preferencesSchema = z.object({ deadline: z.boolean(), wallet: z.boolean(), league: z.boolean(), winners: z.boolean(), telegram: z.boolean() });
const updateProfileSchema = z.object({ displayName: z.string().trim().min(1).max(80).optional(), locale: z.enum(['en']).optional(), badgeConfig: badgeSchema.optional(), notificationPreferences: preferencesSchema.optional() });

const defaultBadge = { templateId: 'elite-shield', icon: 'shield', primaryColor: '#00C853', accentColor: '#00D9FF' };
const defaultPreferences = { deadline: true, wallet: true, league: true, winners: true, telegram: false };

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { authIdentities: true } });
    if (!user) throw new AppError(404, 'Profile not found');
    const telegram = user.authIdentities.find((identity) => identity.provider === 'TELEGRAM');
    res.status(200).json({
      id: user.id, displayName: user.displayName,
      email: user.email,
      telegramUsername: telegram?.username ?? null, telegramPhotoUrl: telegram?.photoUrl ?? null,
      phoneE164: user.phoneE164, locale: user.locale, referralCode: user.referralCode,
      onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
      badgeConfig: user.badgeConfig ?? defaultBadge,
      notificationPreferences: user.notificationPreferences ?? defaultPreferences,
    });
  } catch (error) { next(error); }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateProfileSchema.parse(req.body);
    await prisma.user.update({ where: { id: req.user!.userId }, data: {
      ...(input.displayName ? { displayName: input.displayName, displayNameLower: input.displayName.toLowerCase() } : {}),
      ...(input.locale ? { locale: input.locale } : {}),
      ...(input.badgeConfig ? { badgeConfig: input.badgeConfig } : {}),
      ...(input.notificationPreferences ? { notificationPreferences: input.notificationPreferences } : {}),
    } });
    return getProfile(req, res, next);
  } catch (error) { next(error); }
}

export async function getProfileStatistics(req: Request, res: Response, next: NextFunction) {
  try {
    const [teams, payouts] = await Promise.all([
      prisma.team.findMany({ where: { userId: req.user!.userId }, select: { totalPoints: true } }),
      prisma.ledgerEntry.aggregate({ where: { wallet: { userId: req.user!.userId }, entryType: 'PAYOUT', direction: 'CREDIT' }, _sum: { amountMinor: true } }),
    ]);
    res.status(200).json({ totalPoints: teams.reduce((sum, team) => sum + team.totalPoints, 0), bestRank: null, leaguesWon: 0, prizeEarningsMinor: payouts._sum.amountMinor ?? 0 });
  } catch (error) { next(error); }
}

export async function getProfileAchievements(req: Request, res: Response, next: NextFunction) {
  try {
    const [teamCount, membershipCount, payoutCount] = await Promise.all([
      prisma.team.count({ where: { userId: req.user!.userId } }),
      prisma.leagueMembership.count({ where: { userId: req.user!.userId } }),
      prisma.ledgerEntry.count({ where: { wallet: { userId: req.user!.userId }, entryType: 'PAYOUT' } }),
    ]);
    res.status(200).json({ data: [
      { id: 'club-founder', title: 'Club Founder', unlocked: teamCount > 0 },
      { id: 'league-ready', title: 'League Ready', unlocked: membershipCount > 0 },
      { id: 'prize-winner', title: 'Prize Winner', unlocked: payoutCount > 0 },
    ] });
  } catch (error) { next(error); }
}

export async function getLeaderboard(req: Request, res: Response, next: NextFunction) {
  try {
    const scope = req.query.scope === 'overall' ? 'overall' : 'gameweek';
    const currentGameweek = await prisma.gameweek.findFirst({ where: { isCurrent: true } });
    let rows: Array<{ teamId: string; userId: string; username: string; teamName: string; points: number }> = [];
    if (scope === 'gameweek' && currentGameweek) {
      const scores = await prisma.teamGameweekScore.findMany({ where: { gameweekId: currentGameweek.id }, orderBy: { totalPoints: 'desc' }, take: 100, include: { team: { include: { user: true } } } });
      rows = scores.map((score) => ({ teamId: score.teamId, userId: score.team.userId, username: score.team.user.displayName, teamName: score.team.name, points: score.totalPoints }));
    } else {
      const teams = await prisma.team.findMany({ orderBy: { totalPoints: 'desc' }, take: 100, include: { user: true } });
      rows = teams.map((team) => ({ teamId: team.id, userId: team.userId, username: team.user.displayName, teamName: team.name, points: team.totalPoints }));
    }
    const prizes = [50_000_00, 30_000_00, 20_000_00];
    const data = rows.map((row, index) => ({ rank: index + 1, previousRank: null, userId: row.userId, username: row.username, teamName: row.teamName, points: row.points, prizeMinor: prizes[index] ?? 0, avatarUrl: null, isCurrentUser: row.userId === req.user!.userId }));
    res.status(200).json({ scope, gameweek: currentGameweek?.number ?? null, data, currentUser: data.find((entry) => entry.isCurrentUser) ?? null });
  } catch (error) { next(error); }
}

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.notification.findMany({ where: { userId: req.user!.userId }, orderBy: { createdAt: 'desc' }, take: 50 });
    res.status(200).json({ data: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), readAt: row.readAt?.toISOString() ?? null })), unreadCount: rows.filter((row) => !row.readAt).length });
  } catch (error) { next(error); }
}

export async function markNotificationRead(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const row = await prisma.notification.findFirst({ where: { id, userId: req.user!.userId } });
    if (!row) throw new AppError(404, 'Notification not found');
    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    res.status(200).json({ read: true });
  } catch (error) { next(error); }
}

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const [gameweek, wallet, team, weeklyLeague, ledger, fixtures, announcements] = await Promise.all([
      prisma.gameweek.findFirst({ where: { isCurrent: true } }),
      prisma.wallet.findFirst({ where: { userId: req.user!.userId, walletType: 'USER' } }),
      prisma.team.findFirst({ where: { userId: req.user!.userId }, orderBy: { createdAt: 'desc' } }),
      prisma.league.findFirst({ where: { isPlatformWeekly: true, payoutStatus: 'OPEN' }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { memberships: true } } } }),
      prisma.ledgerEntry.findMany({ where: { wallet: { userId: req.user!.userId } }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.fixture.findMany({ orderBy: { kickoffTime: 'asc' }, take: 8, include: { homeTeam: true, awayTeam: true } }),
      prisma.announcement.findMany({ where: { publishedAt: { lte: new Date() }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { publishedAt: 'desc' }, take: 3 }),
    ]);
    res.status(200).json({ gameweek, wallet, team, featuredWeeklyLeague: weeklyLeague, recentTransactions: ledger, fixtures, announcements });
  } catch (error) { next(error); }
}
