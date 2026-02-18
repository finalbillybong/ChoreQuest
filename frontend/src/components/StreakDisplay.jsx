import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

const flickerAnimation = {
  scale: [1, 1.15, 0.95, 1.1, 1],
  rotate: [-2, 3, -3, 2, 0],
  transition: {
    duration: 0.8,
    repeat: Infinity,
    repeatType: 'mirror',
    ease: 'easeInOut',
  },
};

function getFlameProps(streak) {
  if (streak >= 30) {
    return { size: 32, className: 'text-gold drop-shadow-[0_0_8px_rgba(249,215,28,0.6)]' };
  }
  if (streak >= 7) {
    return { size: 26, className: 'text-gold' };
  }
  return { size: 20, className: 'text-gold/80' };
}

export default function StreakDisplay({ streak = 0, longest = 0 }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const flameProps = getFlameProps(streak);
  const isEpic = streak >= 30;

  return (
    <div
      className="relative inline-flex items-center gap-1.5"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Flame Icon */}
      {isEpic ? (
        <motion.div animate={flickerAnimation} className="flex items-center">
          <Flame size={flameProps.size} className={flameProps.className} />
        </motion.div>
      ) : (
        <Flame size={flameProps.size} className={flameProps.className} />
      )}

      {/* Streak Count */}
      <span
        className={`font-heading text-gold ${
          isEpic ? 'text-sm' : streak >= 7 ? 'text-xs' : 'text-[10px]'
        }`}
      >
        {streak}
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-navy-mid border border-[#2a2a4a] rounded text-center whitespace-nowrap z-10 shadow-lg">
          <p className="font-body text-cream text-sm">
            {streak} day streak
          </p>
          <p className="font-body text-cream/50 text-xs">
            Best: {longest}
          </p>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#2a2a4a]" />
        </div>
      )}
    </div>
  );
}
