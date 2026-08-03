import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Helper to extract the domain/port without the /api path
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
const SOCKET_URL = API_BASE_URL;

let sharedSocket: Socket | null = null;
let subscribersCount = 0;
const listeners = new Set<(payload: any) => void>();

export function useProspectSocket(onDbUpdate?: (payload: any) => void) {
  const [socket, setSocket] = useState<Socket | null>(sharedSocket);

  useEffect(() => {
    if (onDbUpdate) {
      listeners.add(onDbUpdate);
    }
    return () => {
      if (onDbUpdate) {
        listeners.delete(onDbUpdate);
      }
    };
  }, [onDbUpdate]);

  useEffect(() => {
    subscribersCount++;

    if (!sharedSocket) {
      const token = localStorage.getItem('vmind_session');
      if (token) {
        sharedSocket = io(SOCKET_URL, {
          auth: { token },
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        sharedSocket.on('connect', () => {
          console.log('[WEBSOCKET] Connected to server.');
        });

        sharedSocket.on('disconnect', () => {
          console.log('[WEBSOCKET] Disconnected from server.');
        });

        sharedSocket.on('db_update', (payload) => {
          console.log('[WEBSOCKET] Received DB Update:', payload);
          listeners.forEach(listener => listener(payload));
        });

        sharedSocket.on('connect_error', (err) => {
          console.error('[WEBSOCKET] Connection error:', err.message);
        });
      }
    }
    
    setSocket(sharedSocket);

    return () => {
      subscribersCount--;
      if (subscribersCount === 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
      }
    };
  }, []);

  return socket;
}
