import { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';

export default function PointCounter({ value = 0, prefix = 'XP' }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const animationRef = useRef(null);

  useEffect(() => {
    const from = previousValue.current;
    const to = value;
    previousValue.current = value;

    // No animation needed if values are the same
    if (from === to) {
      setDisplayValue(to);
      return;
    }

    const diff = to - from;
    const duration = Math.min(Math.abs(diff) * 15, 1500); // Cap at 1.5s
    const startTime = performance.now();

    function tick(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + diff * eased);

      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(tick);
      }
    }

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value]);

  return (
    <div className="inline-flex items-center gap-1.5">
      <Star size={16} className="text-gold fill-gold" />
      <span className="font-heading text-gold text-sm font-bold tabular-nums">
        {displayValue.toLocaleString()} {prefix}
      </span>
    </div>
  );
}
