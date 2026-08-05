import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { reconnectSocket } from '@/lib/socket';
import { tokenStorage } from '@/lib/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import type { ApiError } from '@/types/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let isRedirectingToTelegramAuth = false;
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
  useAuthStore.getState().clearSession();
  if (!isRedirectingToTelegramAuth && window.location.pathname !== '/telegram-auth') {
    isRedirectingToTelegramAuth = true;
    window.location.assign('/telegram-auth');
  }
}

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
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

    if (url.includes('/api/auth/telegram/start')) {
      return Promise.reject(error.response?.data ?? error);
    }

    const refreshToken = tokenStorage.getRefreshToken();

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
      tokenStorage.setAccessToken(data.accessToken);
      if (data.refreshToken) {
        tokenStorage.setRefreshToken(data.refreshToken);
      }
      useAuthStore.getState().setTokens(
        data.accessToken,
        data.refreshToken ?? refreshToken ?? '',
      );
      onRefreshed(data.accessToken);
      reconnectSocket();
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
