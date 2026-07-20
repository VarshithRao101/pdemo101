import { useSyncExternalStore } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from './apiClient';

export type SocketConnectionState = 'connected' | 'reconnecting' | 'disconnected';

export type SocketLiveEventName =
  | 'fee:updated'
  | 'fee-settings:updated'
  | 'attendance:updated'
  | 'exam-results:updated'
  | 'bulletin:updated'
  | 'hostel:updated'
  | 'student:created';

type SocketHandler = (payload: any) => void;

let socket: Socket | null = null;
let connectionState: SocketConnectionState = 'disconnected';
const connectionSubscribers = new Set<() => void>();

const getSocketBaseUrl = () => {
  const apiBaseUrl = getApiBaseUrl();
  try {
    const parsedUrl = new URL(apiBaseUrl);
    const pathname = parsedUrl.pathname.replace(/\/api\/?$/, '/');
    parsedUrl.pathname = pathname === '/' ? '/' : pathname;
    return parsedUrl.origin + parsedUrl.pathname.replace(/\/$/, '');
  } catch {
    return apiBaseUrl.replace(/\/api\/?$/, '');
  }
};

const getAuthToken = () => sessionStorage.getItem('auth_token');

const notifyConnectionSubscribers = () => {
  for (const subscriber of connectionSubscribers) {
    subscriber();
  }
};

const setConnectionState = (nextState: SocketConnectionState) => {
  if (connectionState === nextState) return;
  connectionState = nextState;
  notifyConnectionSubscribers();
};

const syncSocketAuth = () => {
  if (!socket) return;
  const token = getAuthToken();
  socket.auth = token ? { token: `Bearer ${token}` } : {};
};

const bindSocketLifecycle = () => {
  if (!socket) return;

  socket.off('connect');
  socket.off('disconnect');
  socket.off('connect_error');
  socket.io.off('reconnect_attempt');
  socket.io.off('reconnect');
  socket.io.off('reconnect_error');

  socket.on('connect', () => {
    setConnectionState('connected');
  });

  socket.on('disconnect', () => {
    if (getAuthToken()) {
      setConnectionState('reconnecting');
    } else {
      setConnectionState('disconnected');
    }
  });

  socket.on('connect_error', () => {
    if (getAuthToken()) {
      setConnectionState('reconnecting');
    } else {
      setConnectionState('disconnected');
    }
  });

  socket.io.on('reconnect_attempt', () => {
    syncSocketAuth();
    setConnectionState('reconnecting');
  });

  socket.io.on('reconnect', () => {
    syncSocketAuth();
    setConnectionState('connected');
  });

  socket.io.on('reconnect_error', () => {
    setConnectionState('reconnecting');
  });
};

const ensureSocket = () => {
  if (import.meta.env.PROD && !import.meta.env.VITE_ENABLE_REALTIME) {
    return null;
  }

  if (!socket) {
    socket = io(getSocketBaseUrl(), {
      autoConnect: false,
      transports: ['websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    bindSocketLifecycle();

    // Auto-ack global listener for transaction sync integrity
    socket.onAny((_eventName, ...args) => {
      const payload = args[0];
      if (payload && payload.transactionId) {
        socket?.emit('sync:ack', { transactionId: payload.transactionId });
      }
    });
  }

  return socket;
};

export const connectSocket = (token?: string) => {
  const instance = ensureSocket();
  if (!instance) {
    setConnectionState('disconnected');
    return null;
  }
  if (token) {
    instance.auth = { token: token.startsWith('Bearer ') ? token : `Bearer ${token}` };
  } else {
    syncSocketAuth();
  }

  if (!instance.connected) {
    instance.connect();
  } else {
    setConnectionState('connected');
  }

  return instance;
};

export const disconnectSocket = () => {
  if (!socket) {
    setConnectionState('disconnected');
    return;
  }

  socket.disconnect();
  socket.removeAllListeners();
  socket.io.removeAllListeners();
  socket = null;
  setConnectionState('disconnected');
};

export const getSocketConnectionState = () => connectionState;

export const subscribeSocketConnectionState = (listener: () => void) => {
  connectionSubscribers.add(listener);
  return () => connectionSubscribers.delete(listener);
};

export const useSocketConnectionState = () =>
  useSyncExternalStore(subscribeSocketConnectionState, getSocketConnectionState, getSocketConnectionState);

export const onSocketEvent = (eventName: SocketLiveEventName, handler: SocketHandler) => {
  const instance = ensureSocket();
  if (!instance) {
    return () => {};
  }
  instance.on(eventName, handler);
  return () => {
    instance.off(eventName, handler);
  };
};

export const onceSocketEvent = (eventName: SocketLiveEventName, handler: SocketHandler) => {
  const instance = ensureSocket();
  if (!instance) {
    return () => {};
  }
  instance.once(eventName, handler);
  return () => {
    instance.off(eventName, handler);
  };
};

export const refreshSocketAuth = () => {
  syncSocketAuth();
};
