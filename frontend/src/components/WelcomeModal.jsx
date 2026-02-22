import { useState } from 'react';
import Modal from './Modal';
import { Download, Bell, Smartphone, Monitor } from 'lucide-react';

const TRIGGER_KEY = 'chorequest_show_welcome';

export default function WelcomeModal() {
  const [open, setOpen] = useState(() => {
    try { return !!sessionStorage.getItem(TRIGGER_KEY); } catch { return false; }
  });

  const dismiss = () => {
    setOpen(false);
    try { sessionStorage.removeItem(TRIGGER_KEY); } catch { /* ignore */ }
  };

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={dismiss} title="You're all set!">
      <div className="space-y-5 text-sm text-cream/80">
        {/* Install as app */}
        <div>
          <div className="flex items-center gap-2 text-cream font-semibold mb-1.5">
            <Download size={18} className="text-sky" />
            Install ChoreQuest
          </div>
          <p className="mb-2">
            Add ChoreQuest to your home screen for the best experience — it works just like a native app.
          </p>
          <div className="space-y-2 text-xs text-muted">
            <div className="flex items-start gap-2">
              <Smartphone size={14} className="mt-0.5 shrink-0 text-sky/60" />
              <span><strong className="text-cream/90">iPhone / iPad:</strong> Tap the <strong>Share</strong> button (box with arrow), then <strong>"Add to Home Screen"</strong>.</span>
            </div>
            <div className="flex items-start gap-2">
              <Smartphone size={14} className="mt-0.5 shrink-0 text-sky/60" />
              <span><strong className="text-cream/90">Android:</strong> Tap the <strong>menu (⋮)</strong>, then <strong>"Install app"</strong> or accept the install banner.</span>
            </div>
            <div className="flex items-start gap-2">
              <Monitor size={14} className="mt-0.5 shrink-0 text-sky/60" />
              <span><strong className="text-cream/90">Desktop:</strong> Click the <strong>install icon</strong> in the address bar (Chrome/Edge).</span>
            </div>
          </div>
        </div>

        {/* Enable notifications */}
        <div>
          <div className="flex items-center gap-2 text-cream font-semibold mb-1.5">
            <Bell size={18} className="text-amber-400" />
            Enable Notifications
          </div>
          <p>
            Stay in the loop! Go to <strong className="text-cream/90">Settings → Notifications</strong> to enable
            push notifications for quest assignments, approvals, achievements, and more.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={dismiss}
          className="game-btn game-btn-blue w-full text-base"
        >
          Got it, let's go!
        </button>
      </div>
    </Modal>
  );
}
