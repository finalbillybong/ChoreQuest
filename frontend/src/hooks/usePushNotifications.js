import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

/**
 * Convert a base64 URL-safe string to a Uint8Array (for applicationServerKey).
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  // 'full' | 'needs-install' | 'needs-https' | 'unsupported'
  const [supportLevel, setSupportLevel] = useState('unsupported');

  // Check browser support
  useEffect(() => {
    // Push notifications require a secure context (HTTPS or localhost)
    const isSecure = window.isSecureContext;
    if (!isSecure) {
      setSupportLevel('needs-https');
      setLoading(false);
      return;
    }

    const hasSW = 'serviceWorker' in navigator;
    const hasPush = 'PushManager' in window;
    const hasNotif = 'Notification' in window;
    const ok = hasSW && hasPush && hasNotif;
    setSupported(ok);
    if (ok) {
      setPermission(Notification.permission);
      setSupportLevel('full');
    } else if (hasSW && !hasPush) {
      // iOS Safari in a browser tab — PushManager only exists in standalone PWA mode
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setSupportLevel(isIOS ? 'needs-install' : 'unsupported');
    }
  }, []);

  // Check current subscription status from backend
  const checkStatus = useCallback(async () => {
    if (!supported) {
      setLoading(false);
      return;
    }
    try {
      const data = await api('/api/push/status');
      setSubscribed(data.subscribed);
    } catch {
      // API not available yet or user not authenticated
    } finally {
      setLoading(false);
    }
  }, [supported]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const subscribe = useCallback(async () => {
    if (!supported) return false;

    // Request notification permission
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return false;

    try {
      // Get VAPID public key from server
      const { public_key } = await api('/api/push/vapid-public-key');
      const applicationServerKey = urlBase64ToUint8Array(public_key);

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Clear any stale subscription (e.g. after DB reset changed VAPID keys)
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      // Subscribe to push
      const pushSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const subJson = pushSub.toJSON();

      // Send subscription to backend
      await api('/api/push/subscribe', {
        method: 'POST',
        body: {
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        },
      });

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error('Push subscribe failed:', err);
      return false;
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSub = await registration.pushManager.getSubscription();

      if (pushSub) {
        const subJson = pushSub.toJSON();

        // Tell backend to remove subscription
        await api('/api/push/unsubscribe', {
          method: 'POST',
          body: {
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          },
        });

        // Unsubscribe from browser
        await pushSub.unsubscribe();
      }

      setSubscribed(false);
      return true;
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
      return false;
    }
  }, []);

  const toggle = useCallback(async () => {
    if (subscribed) {
      return unsubscribe();
    }
    return subscribe();
  }, [subscribed, subscribe, unsubscribe]);

  return {
    supported,
    supportLevel,
    permission,
    subscribed,
    loading,
    subscribe,
    unsubscribe,
    toggle,
  };
}
