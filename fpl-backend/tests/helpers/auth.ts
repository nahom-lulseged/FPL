import { Role, type User } from '@prisma/client';
import { prisma } from '../../src/config/db';

type TestUserInput = {
  email?: string;
  name?: string;
  role?: Role;
  aal?: 'aal1' | 'aal2';
  isSuspended?: boolean;
};

export type TestSession = {
  user: User;
  token: string;
  authHeader: { Authorization: string };
};

export async function createTestSession(input: TestUserInput = {}): Promise<TestSession> {
  const displayName = input.name ?? 'Test User';
  const authId = `test-auth-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await prisma.user.create({
    data: {
      supabaseAuthId: authId,
      email: input.email ?? `${authId}@example.test`,
      displayName,
      displayNameLower: displayName.toLowerCase(),
      role: input.role ?? Role.USER,
      isSuspended: input.isSuspended ?? false,
    },
  });
  const token = `test-auth:${authId}:${input.aal ?? 'aal1'}`;

  return {
    user,
    token,
    authHeader: { Authorization: `Bearer ${token}` },
  };
}
