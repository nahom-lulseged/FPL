import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminLoginPage } from '@/pages/auth/AdminLoginPage';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import type { AdminLoginResponse } from '@/types/user';

const { mockAdminLogin } = vi.hoisted(() => ({
  mockAdminLogin: vi.fn(),
}));

vi.mock('@/api/adminAuth.api', () => ({
  adminLogin: mockAdminLogin,
  toStoredUser: (user: AdminLoginResponse['user']) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  }),
}));

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
      clear: vi.fn(() => {
        storage.clear();
      }),
    },
  });
});

function renderLogin(initialEntries: Array<string | { pathname: string; state?: unknown }> = ['/login']) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <AdminLoginPage /> },
      { path: '/dashboard', element: <div>Dashboard</div> },
      { path: '/users', element: <div>Users</div> },
    ],
    { initialEntries },
  );

  render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  globalThis.localStorage?.clear();
  useAdminAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isHydrated: false,
    isLoading: false,
  });
});

describe('AdminLoginPage', () => {
  it('has no authentication-code step', () => {
    renderLogin();

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.queryByLabelText('Authentication code')).not.toBeInTheDocument();
    expect(screen.queryByText('Verify and sign in')).not.toBeInTheDocument();
  });

  it('stores the session and navigates directly to the requested route', async () => {
    mockAdminLogin.mockResolvedValue({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        displayName: 'Admin',
        role: 'ADMIN',
        createdAt: '',
        updatedAt: '',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    renderLogin([{ pathname: '/login', state: { from: { pathname: '/users' } } }]);

    await userEvent.type(screen.getByLabelText('Email'), 'admin@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Users')).toBeInTheDocument();
    expect(useAdminAuthStore.getState().accessToken).toBe('access-token');
    expect(useAdminAuthStore.getState().refreshToken).toBe('refresh-token');
  });

  it('keeps login errors on the credentials form', async () => {
    mockAdminLogin.mockRejectedValue({ error: 'Invalid email or password' });

    renderLogin();

    await userEvent.type(screen.getByLabelText('Email'), 'admin@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByLabelText('Authentication code')).not.toBeInTheDocument();
  });
});
