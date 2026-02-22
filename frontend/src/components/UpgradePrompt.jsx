import { useState, useEffect, useCallback } from 'react';
import { Crown } from 'lucide-react';
import Modal from './Modal';
import { api } from '../api/client';

export default function UpgradePrompt() {
  const [show, setShow] = useState(false);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubscriptionRequired = useCallback((e) => {
    setInfo(e.detail);
    setShow(true);
  }, []);

  useEffect(() => {
    window.addEventListener('subscription:required', handleSubscriptionRequired);
    return () => window.removeEventListener('subscription:required', handleSubscriptionRequired);
  }, [handleSubscriptionRequired]);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const data = await api('/api/billing/checkout', {
        method: 'POST',
        body: {
          success_url: window.location.origin + '/?upgraded=true',
          cancel_url: window.location.origin + '/settings',
        },
      });
      window.location.href = data.url;
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={show}
      onClose={() => setShow(false)}
      title="Upgrade Required"
      actions={[
        {
          label: 'Maybe Later',
          onClick: () => setShow(false),
          className: 'game-btn text-muted hover:text-cream',
        },
        {
          label: loading ? 'Redirecting...' : 'Upgrade Now',
          onClick: handleUpgrade,
          className: 'game-btn game-btn-blue',
          disabled: loading,
        },
      ]}
    >
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4">
          <Crown size={28} className="text-white" />
        </div>
        <p className="text-cream/90 mb-3">
          Your free trial has ended. A subscription is required to continue
          using ChoreQuest with child accounts.
        </p>
        <p className="text-muted text-xs">
          Subscribe to unlock unlimited children, all features, and priority support.
        </p>
      </div>
    </Modal>
  );
}
