import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#60a5fa'];
const PARTICLE_COUNT = 30;
const DURATION = 3;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function generateParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = randomBetween(0, Math.PI * 2);
    const velocity = randomBetween(200, 500);
    const size = randomBetween(6, 14);
    const shape = Math.random() > 0.5 ? 'circle' : 'rect';
    return {
      id: i,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      x: Math.cos(angle) * velocity,
      y: Math.sin(angle) * velocity,
      rotation: randomBetween(0, 720),
      size,
      shape,
    };
  });
}

export default function ConfettiAnimation({ onComplete }) {
  const [visible, setVisible] = useState(true);
  const particles = useMemo(() => generateParticles(), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, DURATION * 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute"
              style={{
                left: '50%',
                top: '40%',
                width: p.shape === 'circle' ? p.size : p.size * 0.7,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: p.shape === 'circle' ? '50%' : '2px',
              }}
              initial={{
                x: 0,
                y: 0,
                opacity: 1,
                rotate: 0,
                scale: 1,
              }}
              animate={{
                x: p.x,
                y: [0, p.y * 0.4, p.y + 300],
                opacity: [1, 1, 0],
                rotate: p.rotation,
                scale: [1, 1.2, 0.5],
              }}
              transition={{
                duration: DURATION,
                ease: [0.25, 0.46, 0.45, 0.94],
                y: {
                  duration: DURATION,
                  ease: [0.22, 0.61, 0.36, 1],
                },
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
