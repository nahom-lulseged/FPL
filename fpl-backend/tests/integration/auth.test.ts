import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import { createTestSession } from '../helpers/auth';

describe('auth integration', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await redis.quit();
  });

  it.each([
    ['register', '/api/auth/register'],
    ['login', '/api/auth/login'],
    ['confirm', '/api/auth/confirm'],
    ['email link', '/api/auth/link/email'],
    ['telegram link', '/api/auth/link/telegram'],
  ])('returns 404 for removed consumer %s route', async (_name, route) => {
    const res = await request(app).post(route).send({});

    expect(res.status).toBe(404);
  });

  it('returns 401 when accessing /api/me without a token', async () => {
    const res = await request(app).get('/api/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('returns 200 with user info when accessing /api/me with a valid session', async () => {
    const session = await createTestSession({
      email: 'test@example.com',
      name: 'Test User',
    });

    const res = await request(app)
      .get('/api/me')
      .set(session.authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: session.user.id,
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'USER',
    });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('rejects a suspended user session', async () => {
    const session = await createTestSession({ isSuspended: true });

    const res = await request(app)
      .get('/api/me')
      .set(session.authHeader);

    expect(res.status).toBe(401);
  });
});
