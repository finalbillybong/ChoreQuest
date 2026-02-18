import { useEffect, useRef, useCallback, useState } from 'react';
import { getAccessToken } from '../api/client';

export function useWebSocket(userId, onMessage) {
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);
  const retryCount = useRef(0);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (!userId) return;
    const token = getAccessToken();
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/${userId}?token=${token}`);

    ws.onopen = () => {
      setConnected(true);
      retryCount.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
      retryCount.current += 1;
      reconnectTimeout.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
    wsRef.current = ws;
  }, [userId, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return { connected };
}
