import { io, type Socket } from 'socket.io-client';
import { tokenStorage } from '@/lib/tokenStorage';

// Socket URL must match the API host (same origin as VITE_API_BASE_URL / backend CORS_ORIGIN).
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket | null {
  const token = tokenStorage.getAccessToken();
  if (!token) {
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, {
    autoConnect: true,
    auth: { token },
  });

  return socket;
}

export function reconnectSocket(): void {
  const token = tokenStorage.getAccessToken();
  if (!token) {
    disconnectSocket();
    return;
  }

  if (socket) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
    return;
  }

  connectSocket();
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
