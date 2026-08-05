import request from 'supertest';
import { Role } from '@prisma/client';

const mockSignInWithPassword = jest.fn();
const mockGetClaims = jest.fn();

jest.mock('../../src/config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      getClaims: mockGetClaims,
    },
  },
  supabaseAdmin: {
    auth: {
      admin: {},
    },
  },
}));

import app from '../../src/app';
import { prisma } from '../../src/config/db';

const adminUser = {
  email: 'admin-password-test@example.com',
  password: 'password123',
  name: 'Password Admin',
  supabaseAuthId: 'admin-auth-password-test',
};

async function createUser(overrides: Partial<Parameters<typeof prisma.user.create>[0]['data']> = {}) {
  return prisma.user.create({
    data: {
      email: adminUser.email,
      supabaseAuthId: adminUser.supabaseAuthId,
      displayName: adminUser.name,
      displayNameLower: adminUser.name.toLowerCase(),
      role: Role.ADMIN,
      ...overrides,
    },
  });
}

async function clearTestUsers() {
  await prisma.user.deleteMany({
    where: {
      supabaseAuthId: {
        in: [adminUser.supabaseAuthId],
      },
    },
  });
}

function mockClaims(authId = adminUser.supabaseAuthId, aal: 'aal1' | 'aal2' = 'aal1') {
  mockGetClaims.mockResolvedValue({
    data: {
      claims: {
        sub: authId,
        aal,
      },
    },
    error: null,
  });
}

describe('admin password auth', () => {
  beforeAll(async () => {
    await clearTestUsers();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await clearTestUsers();
    mockClaims();
  });

  afterAll(async () => {
    await clearTestUsers();
    await prisma.$disconnect();
  });

  it('returns an admin session immediately for valid credentials', async () => {
    await createUser();
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: adminUser.supabaseAuthId },
        session: {
          access_token: 'admin-access-token',
          refresh_token: 'admin-refresh-token',
        },
      },
      error: null,
    });

    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe('admin-access-token');
    expect(res.body.refreshToken).toBe('admin-refresh-token');
    expect(res.body.user.email).toBe(adminUser.email);
    expect(res.body.user.role).toBe(Role.ADMIN);
    expect(res.body.requiresTwoFactor).toBeUndefined();
    expect(res.body.partialToken).toBeUndefined();
    expect(res.body.needsEnrollment).toBeUndefined();
  });

  it('rejects invalid Supabase credentials', async () => {
    await createUser();
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new Error('Invalid credentials'),
    });

    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: adminUser.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('rejects a valid Supabase session for a non-admin user', async () => {
    await createUser({ role: Role.USER });
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: adminUser.supabaseAuthId },
        session: {
          access_token: 'user-access-token',
          refresh_token: 'user-refresh-token',
        },
      },
      error: null,
    });

    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('rejects a suspended admin', async () => {
    await createUser({ isSuspended: true });
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: adminUser.supabaseAuthId },
        session: {
          access_token: 'suspended-access-token',
          refresh_token: 'suspended-refresh-token',
        },
      },
      error: null,
    });

    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Account suspended');
  });

  it('allows an aal1 admin session on protected admin routes', async () => {
    await createUser();
    mockClaims(adminUser.supabaseAuthId, 'aal1');

    const res = await request(app)
      .get('/api/admin/health')
      .set('Authorization', 'Bearer aal1-admin-token');

    expect(res.status).toBe(200);
  });

  it('keeps authenticated non-admin sessions forbidden on protected admin routes', async () => {
    await createUser({ role: Role.USER });
    mockClaims(adminUser.supabaseAuthId, 'aal1');

    const res = await request(app)
      .get('/api/admin/health')
      .set('Authorization', 'Bearer aal1-user-token');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('returns 404 for removed admin 2FA endpoints', async () => {
    const completeRes = await request(app).post('/api/admin/auth/2fa/complete').send({});
    const setupRes = await request(app).post('/api/admin/auth/2fa/setup').send({});
    const verifyRes = await request(app).post('/api/admin/auth/2fa/verify').send({});

    expect(completeRes.status).toBe(404);
    expect(setupRes.status).toBe(404);
    expect(verifyRes.status).toBe(404);
  });
});
