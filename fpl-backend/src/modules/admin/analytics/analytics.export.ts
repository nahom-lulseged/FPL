import type { Response } from 'express';
import { prisma } from '../../../config/db';
import { AppError } from '../../../middleware/errorHandler';
import type { ExportEntity } from './analytics.types';

const BATCH_SIZE = 500;

export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function formatCsvRow(values: unknown[]): string {
  return `${values.map(escapeCsvField).join(',')}\n`;
}

function exportFilename(entity: ExportEntity): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${entity}-${date}.csv`;
}

async function streamUsers(res: Response): Promise<void> {
  res.write(
    formatCsvRow([
      'id',
      'email',
      'displayName',
      'role',
      'isSuspended',
      'createdAt',
      'teamCount',
    ]),
  );

  let cursor: string | undefined;

  for (;;) {
    const users = await prisma.user.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isSuspended: true,
        createdAt: true,
        _count: { select: { teams: true } },
      },
    });

    if (users.length === 0) {
      break;
    }

    for (const user of users) {
      res.write(
        formatCsvRow([
          user.id,
          user.email,
          user.displayName,
          user.role,
          user.isSuspended,
          user.createdAt.toISOString(),
          user._count.teams,
        ]),
      );
    }

    cursor = users[users.length - 1]!.id;
    if (users.length < BATCH_SIZE) {
      break;
    }
  }
}

async function streamPlayers(res: Response): Promise<void> {
  res.write(
    formatCsvRow([
      'id',
      'name',
      'position',
      'price',
      'realTeamName',
      'isAvailable',
      'injuryNote',
      'isManualOverride',
    ]),
  );

  let cursor: string | undefined;

  for (;;) {
    const players = await prisma.player.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        position: true,
        price: true,
        isAvailable: true,
        injuryNote: true,
        isManualOverride: true,
        realTeam: { select: { name: true } },
      },
    });

    if (players.length === 0) {
      break;
    }

    for (const player of players) {
      res.write(
        formatCsvRow([
          player.id,
          player.name,
          player.position,
          player.price,
          player.realTeam.name,
          player.isAvailable,
          player.injuryNote,
          player.isManualOverride,
        ]),
      );
    }

    cursor = players[players.length - 1]!.id;
    if (players.length < BATCH_SIZE) {
      break;
    }
  }
}

async function streamLeagues(res: Response): Promise<void> {
  res.write(
    formatCsvRow([
      'id',
      'name',
      'type',
      'season',
      'inviteCode',
      'memberCount',
      'creatorEmail',
      'createdAt',
    ]),
  );

  let cursor: string | undefined;

  for (;;) {
    const leagues = await prisma.league.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        season: true,
        inviteCode: true,
        createdAt: true,
        adminUserId: true,
        _count: { select: { memberships: true } },
      },
    });

    if (leagues.length === 0) {
      break;
    }

    const creatorIds = [...new Set(leagues.map((league) => league.adminUserId))];
    const creators = await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, email: true },
    });
    const emailById = new Map(creators.map((creator) => [creator.id, creator.email]));

    for (const league of leagues) {
      res.write(
        formatCsvRow([
          league.id,
          league.name,
          league.type,
          league.season,
          league.inviteCode,
          league._count.memberships,
          emailById.get(league.adminUserId) ?? '',
          league.createdAt.toISOString(),
        ]),
      );
    }

    cursor = leagues[leagues.length - 1]!.id;
    if (leagues.length < BATCH_SIZE) {
      break;
    }
  }
}

export async function streamEntityExport(
  entity: ExportEntity,
  res: Response,
): Promise<void> {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${exportFilename(entity)}"`);

  switch (entity) {
    case 'users':
      await streamUsers(res);
      break;
    case 'players':
      await streamPlayers(res);
      break;
    case 'leagues':
      await streamLeagues(res);
      break;
    default:
      throw new AppError(400, 'Unsupported export entity');
  }

  res.end();
}
