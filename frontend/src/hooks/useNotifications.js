import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api('/api/notifications?limit=20');
      setNotifications(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await api('/api/notifications/unread-count');
      setUnreadCount(data.count);
    } catch { /* ignore */ }
  }, []);

  const markRead = async (id) => {
    await api(`/api/notifications/${id}/read`, { method: 'POST' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await api('/api/notifications/read-all', { method: 'POST' });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const refresh = useCallback(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live updates via WebSocket - refresh notifications when any WS message arrives
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('ws:message', handler);
    return () => window.removeEventListener('ws:message', handler);
  }, [refresh]);

  return { notifications, unreadCount, markRead, markAllRead, refresh };
}
