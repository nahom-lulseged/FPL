import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import { createTestSession } from '../helpers/auth';

describe('cross-track integration contracts', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
    const keys = await redis.keys('refresh:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('serves OpenAPI spec and docs UI', async () => {
    const spec = await request(app).get('/api/openapi.yaml');
    expect(spec.status).toBe(200);
    expect(spec.text).toContain('openapi:');

    const docs = await request(app).get('/api/docs');
    expect(docs.status).toBe(200);
    expect(docs.text).toContain('swagger-ui');
  });

  it('returns extended /api/me profile fields used by both frontends', async () => {
    const session = await createTestSession({
      email: 'cross@example.com',
      name: 'Cross Track',
    });

    const me = await request(app)
      .get('/api/me')
      .set(session.authHeader);

    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      email: 'cross@example.com',
      displayName: 'Cross Track',
      role: 'USER',
    });
    expect(me.body.createdAt).toBeDefined();
    expect(me.body.updatedAt).toBeDefined();
  });
});
