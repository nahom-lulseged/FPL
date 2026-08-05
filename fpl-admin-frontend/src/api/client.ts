import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { adminTokenStorage } from '@/lib/tokenStorage';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import type { ApiError } from '@/types/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let isRedirectingToLogin = false;
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function subscribeTokenRefresh(
  resolve: (token: string) => void,
  reject: (error: unknown) => void,
): void {
  refreshSubscribers.push({ resolve, reject });
}

function onRefreshed(token: string): void {
  refreshSubscribers.forEach((subscriber) => subscriber.resolve(token));
  refreshSubscribers = [];
}

function onRefreshFailed(error: unknown): void {
  refreshSubscribers.forEach((subscriber) => subscriber.reject(error));
  refreshSubscribers = [];
}

function clearSessionAndRedirect(): void {
  useAdminAuthStore.getState().clearSession();
  if (!isRedirectingToLogin && window.location.pathname !== '/login') {
    isRedirectingToLogin = true;
    window.location.assign('/login');
  }
}

apiClient.interceptors.request.use((config) => {
  const token = adminTokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error.response?.data ?? error);
    }

    const url = originalRequest.url ?? '';
    if (url.includes('/api/auth/refresh')) {
      clearSessionAndRedirect();
      return Promise.reject(error.response?.data ?? error);
    }

    if (url.includes('/api/auth/login')) {
      return Promise.reject(error.response?.data ?? error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          apiClient(originalRequest).then(resolve).catch(reject);
        }, reject);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post<{ accessToken: string; refreshToken?: string }>(
        `${BASE_URL}/api/auth/refresh`,
        {},
        { withCredentials: true },
      );
      adminTokenStorage.setAccessToken(data.accessToken);
      if (data.refreshToken) {
        adminTokenStorage.setRefreshToken(data.refreshToken);
      }
      onRefreshed(data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      onRefreshFailed(refreshError);
      clearSessionAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
