import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import { createTestSession } from '../helpers/auth';

const testUser = {
  email: 'audit-test-admin@example.com',
  password: 'password123',
  name: 'Audit Admin',
};

const targetUser = {
  email: 'audit-target-user@example.com',
  password: 'password123',
  name: 'Audit Target',
};

async function clearRedisKeys(): Promise<void> {
  const keys = await redis.keys('refresh:*');
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

describe('admin audit log API', () => {
  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();
    await clearRedisKeys();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('lists audit entries created by admin actions with filters', async () => {
    const token = await getAdminToken();

    const target = await createTestSession({
      email: targetUser.email,
      name: targetUser.name,
    });
    const targetUserId = target.user.id;

    const suspendRes = await request(app)
      .patch(`/api/admin/users/${targetUserId}/suspend`)
      .set('Authorization', `Bearer ${token}`)
      .send({ suspended: true, reason: 'Audit test' });

    expect(suspendRes.status).toBe(200);

    const listRes = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${token}`)
      .query({ action: 'USER_SUSPEND', targetType: 'User', limit: 10, page: 1 });

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].action).toBe('USER_SUSPEND');
    expect(listRes.body.data[0].targetType).toBe('User');
    expect(listRes.body.data[0].targetId).toBe(targetUserId);
    expect(listRes.body.data[0].admin.email).toBe(testUser.email);
    expect(listRes.body.meta.total).toBe(1);
  });

  it('returns 401 without admin token', async () => {
    const res = await request(app).get('/api/admin/audit');
    expect(res.status).toBe(401);
  });
});
