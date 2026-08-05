import { useEffect, useState } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';

export function useSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      setIsConnected(false);
      return;
    }

    const socket = connectSocket();
    if (!socket) {
      setIsConnected(false);
      return;
    }

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    setIsConnected(socket.connected);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [isAuthenticated]);

  return {
    socket: isAuthenticated ? getSocket() : null,
    isConnected,
  };
}

export function useSocketEvent<T>(
  event: string,
  handler: (payload: T) => void,
  enabled = true,
): void {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !enabled) {
      return;
    }

    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler, enabled]);
}
