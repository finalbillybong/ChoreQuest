import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function UpdatePrompt() {
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    const handler = (e) => setRegistration(e.detail);
    window.addEventListener('sw:update-available', handler);
    return () => window.removeEventListener('sw:update-available', handler);
  }, []);

  if (!registration?.waiting) return null;

  const handleUpdate = () => {
    registration.waiting.postMessage('SKIP_WAITING');
    // controllerchange listener in main.jsx will auto-reload
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-2">
      <button
        onClick={handleUpdate}
        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white
                   text-sm font-medium px-4 py-2.5 rounded-full shadow-lg
                   transition-colors active:scale-95"
      >
        <RefreshCw size={16} />
        Update available — tap to refresh
      </button>
    </div>
  );
}
