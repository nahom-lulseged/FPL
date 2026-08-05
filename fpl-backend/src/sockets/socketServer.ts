import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { resolveAuthenticatedUser } from '../middleware/authGuard';
import { initLiveScoresGateway } from './liveScores.gateway';

let io: Server | null = null;
export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, { cors: { origin: env.CORS_ORIGIN, credentials: true } });
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const identity = await resolveAuthenticatedUser(token);
      if (!identity) return next(new Error('Unauthorized'));
      socket.data.userId = identity.userId; next();
    } catch { next(new Error('Unauthorized')); }
  });
  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    socket.on('join:gw', (value: number) => { if (Number.isInteger(value) && value > 0) socket.join(`gw:${value}`); });
    socket.on('leave:gw', (value: number) => { if (Number.isInteger(value) && value > 0) socket.leave(`gw:${value}`); });
    socket.on('join:team', async (id: string) => { const db = (await import('../config/db')).prisma; if (await db.team.findFirst({ where: { id, userId } })) socket.join(`team:${id}`); });
    socket.on('join:league', async (id: string) => { const db = (await import('../config/db')).prisma; if (await db.leagueMembership.findUnique({ where: { leagueId_userId: { leagueId: id, userId } } })) socket.join(`league:${id}`); });
    socket.on('disconnect', () => logger.debug({ userId, socketId: socket.id }, 'Socket disconnected'));
  });
  initLiveScoresGateway(io); return io;
}
export const getSocketServer = () => io;
export async function shutdownSocketServer() { if (io) { await io.close(); io = null; } }
