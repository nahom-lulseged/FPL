import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';

describe('API route access boundaries', () => {
  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  it('does not require auth before public players validation runs', async () => {
    const res = await request(app).get('/api/players?position=INVALID');

    expect(res.status).toBe(400);
    expect(res.body.error).not.toBe('Unauthorized');
  });

  it('still protects experience routes', async () => {
    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });
});
