import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';

const EMOTES = [
  { id: 'wave', icon: '\uD83D\uDC4B', label: 'Wave' },
  { id: 'cheer', icon: '\uD83C\uDF89', label: 'Cheer' },
  { id: 'dance', icon: '\uD83D\uDD7A', label: 'Dance' },
  { id: 'flex', icon: '\uD83D\uDCAA', label: 'Flex' },
  { id: 'sparkle', icon: '\u2728', label: 'Sparkle' },
  { id: 'highfive', icon: '\uD83D\uDE4C', label: 'High Five' },
];

function FloatingEmote({ emote, onDone }) {
  return (
    <motion.div
      className="fixed pointer-events-none text-4xl z-50"
      style={{ left: `${30 + Math.random() * 40}%` }}
      initial={{ opacity: 1, y: 0, bottom: '15%' }}
      animate={{ opacity: 0, y: -200 }}
      transition={{ duration: 2, ease: 'easeOut' }}
      onAnimationComplete={onDone}
    >
      {emote.icon}
    </motion.div>
  );
}

export default function EmoteBar() {
  const [floaters, setFloaters] = useState([]);
  const [cooldown, setCooldown] = useState(false);

  // Listen for incoming emotes via WebSocket
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.type === 'emote') {
        const emoteData = EMOTES.find((em) => em.id === e.detail.data?.emote);
        if (emoteData) {
          const id = Date.now() + Math.random();
          setFloaters((prev) => [...prev, { ...emoteData, key: id, userName: e.detail.data.user_name }]);
        }
      }
    };
    window.addEventListener('ws:message', handler);
    return () => window.removeEventListener('ws:message', handler);
  }, []);

  const sendEmote = async (emote) => {
    if (cooldown) return;
    setCooldown(true);
    setTimeout(() => setCooldown(false), 1500);

    try {
      await api('/api/emotes', { method: 'POST', body: { emote: emote.id } });
    } catch {
      // ignore
    }

    // Show locally immediately
    const id = Date.now() + Math.random();
    setFloaters((prev) => [...prev, { ...emote, key: id, userName: 'You' }]);
  };

  const removeFloater = (key) => {
    setFloaters((prev) => prev.filter((f) => f.key !== key));
  };

  return (
    <>
      {/* Floating emotes */}
      <AnimatePresence>
        {floaters.map((f) => (
          <FloatingEmote key={f.key} emote={f} onDone={() => removeFloater(f.key)} />
        ))}
      </AnimatePresence>

      {/* Emote bar */}
      <div className="flex items-center gap-1.5 justify-center">
        {EMOTES.map((emote) => (
          <button
            key={emote.id}
            onClick={() => sendEmote(emote)}
            disabled={cooldown}
            className={`w-9 h-9 rounded-lg text-lg transition-all hover:scale-110 active:scale-95 bg-surface-raised border border-border/50 hover:border-border-light ${
              cooldown ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title={emote.label}
          >
            {emote.icon}
          </button>
        ))}
      </div>
    </>
  );
}
