import request from 'supertest';
import { AlertType } from '@prisma/client';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import {
  sendAlert,
} from '../../src/modules/admin/system/alert.service';
import {
  __clearLogBufferForTests,
  __pushLogForTests,
} from '../../src/lib/logger';
import { processBootstrapSync } from '../../src/jobs/bootstrapSync.job';
import * as ingestionService from '../../src/modules/ingestion/ingestion.service';
import { createTestSession } from '../helpers/auth';

const testUser = {
  email: 'admin-system@example.com',
  password: 'password123',
  name: 'Admin System',
};

async function clearRedisKeys(): Promise<void> {
  const keys = await redis.keys('*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

async function getAdminToken(): Promise<string> {
  const session = await createTestSession({
    email: testUser.email,
    name: testUser.name,
    role: 'ADMIN',
    aal: 'aal2',
  });
  return session.token;
}

async function getUserToken(): Promise<string> {
  const session = await createTestSession({
    email: 'regular-system@example.com',
    name: 'Regular System',
  });
  return session.token;
}

describe('admin system routes', () => {
  beforeEach(async () => {
    await prisma.alertConfig.deleteMany();
    await prisma.user.deleteMany();
    await clearRedisKeys();
    __clearLogBufferForTests();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.alertConfig.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('access control', () => {
    it('returns 401 for /api/admin/system/health without a token', async () => {
      const res = await request(app).get('/api/admin/system/health');
      expect(res.status).toBe(401);
    });

    it('returns 403 for /api/admin/system/health with non-admin token', async () => {
      const token = await getUserToken();
      const res = await request(app)
        .get('/api/admin/system/health')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('returns 401 for /admin/queues without auth', async () => {
      const res = await request(app).get('/admin/queues');
      expect(res.status).toBe(401);
    });

    it('returns 403 for /admin/queues with non-admin token', async () => {
      const token = await getUserToken();
      const res = await request(app)
        .get('/admin/queues')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/system/health', () => {
    it('returns latency and memory metrics', async () => {
      const token = await getAdminToken();
      const res = await request(app)
        .get('/api/admin/system/health')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toMatch(/ok|degraded|down/);
      expect(res.body.db.latencyMs).toBeGreaterThanOrEqual(0);
      expect(res.body.redis.latencyMs).toBeGreaterThanOrEqual(0);
      expect(res.body.memory.heapUsedMb).toBeGreaterThan(0);
      expect(Array.isArray(res.body.queues)).toBe(true);
    });
  });

  describe('GET /api/admin/system/logs', () => {
    it('filters logs by level and search', async () => {
      __pushLogForTests({
        time: new Date().toISOString(),
        level: 'error',
        msg: 'bootstrap sync exploded',
      });
      __pushLogForTests({
        time: new Date().toISOString(),
        level: 'info',
        msg: 'server started',
      });

      const token = await getAdminToken();
      const res = await request(app)
        .get('/api/admin/system/logs')
        .query({ level: 'error', search: 'bootstrap' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toHaveLength(1);
      expect(res.body.logs[0].msg).toContain('bootstrap');
    });
  });

  describe('alert config CRUD', () => {
    it('updates and returns alert configs', async () => {
      const token = await getAdminToken();

      const putRes = await request(app)
        .put('/api/admin/system/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          configs: [
            {
              alertType: 'INGESTION_FAILURE',
              webhookUrl: 'https://discord.com/api/webhooks/test',
              enabled: true,
            },
          ],
        });

      expect(putRes.status).toBe(200);
      expect(putRes.body.configs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alertType: 'INGESTION_FAILURE',
            enabled: true,
          }),
        ]),
      );

      const getRes = await request(app)
        .get('/api/admin/system/alerts')
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      const ingestion = getRes.body.configs.find(
        (c: { alertType: string }) => c.alertType === 'INGESTION_FAILURE',
      );
      expect(ingestion.enabled).toBe(true);
    });

    it('rejects invalid webhook URL when enabled', async () => {
      const token = await getAdminToken();
      const res = await request(app)
        .put('/api/admin/system/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          configs: [
            {
              alertType: 'INGESTION_FAILURE',
              webhookUrl: 'not-a-url',
              enabled: true,
            },
          ],
        });

      expect(res.status).toBe(400);
    });
  });

  describe('alert delivery', () => {
    it('sends webhook on sendAlert when configured', async () => {
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      await prisma.alertConfig.create({
        data: {
          alertType: AlertType.INGESTION_FAILURE,
          webhookUrl: 'https://discord.com/api/webhooks/test',
          enabled: true,
        },
      });

      const sent = await sendAlert(AlertType.INGESTION_FAILURE, {
        title: 'Test',
        message: 'Something failed',
      });

      expect(sent).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('fires alert when bootstrap sync fails', async () => {
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      await prisma.alertConfig.create({
        data: {
          alertType: AlertType.INGESTION_FAILURE,
          webhookUrl: 'https://discord.com/api/webhooks/test',
          enabled: true,
        },
      });

      jest.spyOn(ingestionService, 'syncRealTeams').mockRejectedValue(new Error('FPL down'));

      await expect(processBootstrapSync()).rejects.toThrow('FPL down');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe('bull-board session cookie', () => {
    it('sets cookie and allows /admin/queues access', async () => {
      const token = await getAdminToken();

      const sessionRes = await request(app)
        .post('/api/admin/system/queues/session')
        .set('Authorization', `Bearer ${token}`);

      expect(sessionRes.status).toBe(200);
      expect(sessionRes.headers['set-cookie']).toBeDefined();

      const cookie = sessionRes.headers['set-cookie'][0] as string;

      const boardRes = await request(app).get('/admin/queues').set('Cookie', cookie);

      expect(boardRes.status).toBe(503);
      expect(boardRes.body.error).toBe('BullMQ is disabled');
    });

    it('returns 403 for session endpoint with non-admin', async () => {
      const token = await getUserToken();
      const res = await request(app)
        .post('/api/admin/system/queues/session')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });
});
