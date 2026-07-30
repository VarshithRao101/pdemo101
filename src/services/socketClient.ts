import { useSyncExternalStore } from 'react';

export type SocketConnectionState = 'connected' | 'reconnecting' | 'disconnected';

export type SocketLiveEventName =
  | 'fee:updated'
  | 'fee-settings:updated'
  | 'attendance:updated'
  | 'exam-results:updated'
  | 'bulletin:updated'
  | 'hostel:updated'
  | 'student:created'
  | 'student:updated'
  | 'student:deleted'
  | 'expenditure:updated'
  | 'workerPayment:updated'
  | 'sync:journal-updated';

type SocketHandler = (payload: any) => void;

let connectionState: SocketConnectionState = 'connected';
const connectionSubscribers = new Set<() => void>();
const eventHandlersMap = new Map<string, Set<SocketHandler>>();

// Cross-tab broadcast channel for instant multi-window synchronization on Vercel
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('inspire_erp_realtime_sync');
    broadcastChannel.onmessage = (event) => {
      const { eventName, payload } = event.data || {};
      if (eventName) {
        dispatchLocalEvent(eventName, payload, false);
      }
    };
  } catch (err) {
    console.warn('BroadcastChannel disabled or unavailable:', err);
  }
}

// Internal dispatcher
const dispatchLocalEvent = (eventName: string, payload: any, broadcast = true) => {
  const handlers = eventHandlersMap.get(eventName);
  if (handlers) {
    handlers.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error(`Error executing event handler for ${eventName}:`, err);
      }
    });
  }

  if (broadcast && broadcastChannel) {
    try {
      broadcastChannel.postMessage({ eventName, payload });
    } catch (_e) {
      // Ignore broadcast errors
    }
  }
};

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

export const connectSocket = (_token?: string) => {
  setConnectionState('connected');
  return {
    connected: true,
    emit: (eventName: string, payload?: any) => {
      emitLocalSocketEvent(eventName, payload);
    }
  };
};

export const disconnectSocket = () => {
  setConnectionState('disconnected');
};

export const getSocketConnectionState = () => connectionState;

export const subscribeSocketConnectionState = (listener: () => void) => {
  connectionSubscribers.add(listener);
  return () => connectionSubscribers.delete(listener);
};

export const useSocketConnectionState = () =>
  useSyncExternalStore(subscribeSocketConnectionState, getSocketConnectionState, getSocketConnectionState);

export const onSocketEvent = (eventName: SocketLiveEventName | string, handler: SocketHandler) => {
  if (!eventHandlersMap.has(eventName)) {
    eventHandlersMap.set(eventName, new Set());
  }
  const handlers = eventHandlersMap.get(eventName)!;
  handlers.add(handler);

  return () => {
    handlers.delete(handler);
    if (handlers.size === 0) {
      eventHandlersMap.delete(eventName);
    }
  };
};

export const onceSocketEvent = (eventName: SocketLiveEventName | string, handler: SocketHandler) => {
  const wrapper: SocketHandler = (payload: any) => {
    handler(payload);
    unsubscribe();
  };
  const unsubscribe = onSocketEvent(eventName, wrapper);
  return unsubscribe;
};

export const emitLocalSocketEvent = (eventName: string, payload?: any) => {
  dispatchLocalEvent(eventName, payload, true);
};

export const refreshSocketAuth = () => {
  setConnectionState('connected');
};
