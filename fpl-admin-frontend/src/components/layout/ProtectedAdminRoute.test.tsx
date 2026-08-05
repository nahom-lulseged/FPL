import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ProtectedAdminRoute,
  PublicOnlyAdminRoute,
} from '@/components/layout/ProtectedAdminRoute';
import { useAdminAuthStore } from '@/store/adminAuthStore';

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

function renderProtectedRoutes(initialEntries = ['/dashboard']): void {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<ProtectedAdminRoute />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Route>
        <Route path="/login" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderPublicOnlyRoutes(initialEntries = ['/login']): void {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<PublicOnlyAdminRoute />}>
          <Route path="/login" element={<div>Login</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
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

describe('ProtectedAdminRoute', () => {
  it('redirects unauthenticated users to login', async () => {
    useAdminAuthStore.setState({ isHydrated: true, isAuthenticated: false });

    renderProtectedRoutes();

    expect(await screen.findByText('Login')).toBeInTheDocument();
  });

  it('allows authenticated admins through', async () => {
    useAdminAuthStore.setState({
      isHydrated: true,
      isAuthenticated: true,
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        displayName: 'Admin',
        role: 'ADMIN',
        createdAt: '',
        updatedAt: '',
      },
    });

    renderProtectedRoutes();

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });
});

describe('PublicOnlyAdminRoute', () => {
  it('redirects signed-in admins away from login', async () => {
    useAdminAuthStore.setState({
      isHydrated: true,
      isAuthenticated: true,
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        displayName: 'Admin',
        role: 'ADMIN',
        createdAt: '',
        updatedAt: '',
      },
    });

    renderPublicOnlyRoutes(['/login']);

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });
});
