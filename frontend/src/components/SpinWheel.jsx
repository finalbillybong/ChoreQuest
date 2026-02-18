import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import ConfettiAnimation from './ConfettiAnimation';

const SEGMENTS = [
  { value: 1, color: '#ff4444' },
  { value: 5, color: '#f9d71c' },
  { value: 2, color: '#2de2a6' },
  { value: 10, color: '#b388ff' },
  { value: 3, color: '#64dfdf' },
  { value: 15, color: '#ff8c42' },
  { value: 1, color: '#ff6b9d' },
  { value: 25, color: '#f9d71c' },
  { value: 2, color: '#45b7d1' },
  { value: 5, color: '#2de2a6' },
  { value: 3, color: '#b388ff' },
  { value: 10, color: '#ff4444' },
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
    'Z',
  ].join(' ');
}

export default function SpinWheel({ onResult, disabled = false }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState(null);
  const hasSpunRef = useRef(false);

  const handleSpin = useCallback(async () => {
    if (spinning || disabled) return;

    setSpinning(true);
    setResult(null);
    setError(null);

    try {
      // Call API to get the spin result
      const data = await api('/api/spin/spin', { method: 'POST' });
      const wonPoints = data.points || data.result || 5;

      // Find segment index that matches (or pick random one with similar value)
      let targetIdx = SEGMENTS.findIndex((s) => s.value === wonPoints);
      if (targetIdx === -1) targetIdx = Math.floor(Math.random() * SEGMENTS.length);

      // Calculate target rotation:
      // We want the pointer (at top) to point to the target segment
      // Each segment spans SEGMENT_ANGLE degrees, center of segment is at (idx * SEGMENT_ANGLE + SEGMENT_ANGLE/2)
      const segmentCenter = targetIdx * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
      // Rotate wheel so this segment is at the top (0/360 degrees)
      // Add multiple full rotations for dramatic effect
      const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
      const targetRotation = rotation + fullSpins * 360 + (360 - segmentCenter);

      setRotation(targetRotation);

      // After animation completes, show result
      setTimeout(() => {
        setResult(wonPoints);
        setShowConfetti(true);
        setSpinning(false);
        onResult?.(wonPoints);
      }, 3500);
    } catch (err) {
      setError(err.message || 'Spin failed!');
      setSpinning(false);
    }
  }, [spinning, disabled, rotation, onResult]);

  const cx = 150;
  const cy = 150;
  const r = 140;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Confetti */}
      {showConfetti && (
        <ConfettiAnimation onComplete={() => setShowConfetti(false)} />
      )}

      {/* Wheel Container */}
      <div className="relative">
        {/* Pointer / Triangle at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
          <div
            className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-gold"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
          />
        </div>

        {/* Wheel SVG */}
        <motion.div
          animate={{ rotate: rotation }}
          transition={{
            duration: 3.5,
            ease: [0.2, 0.8, 0.3, 1],
          }}
          className="w-[300px] h-[300px]"
        >
          <svg
            width="300"
            height="300"
            viewBox="0 0 300 300"
            className="drop-shadow-xl"
          >
            {/* Outer ring */}
            <circle
              cx={cx}
              cy={cy}
              r={r + 4}
              fill="none"
              stroke="#2a2a4a"
              strokeWidth="4"
            />

            {/* Segments */}
            {SEGMENTS.map((seg, i) => {
              const startAngle = i * SEGMENT_ANGLE;
              const endAngle = startAngle + SEGMENT_ANGLE;
              const labelAngle = startAngle + SEGMENT_ANGLE / 2;
              const labelPos = polarToCartesian(cx, cy, r * 0.65, labelAngle);

              return (
                <g key={i}>
                  <path
                    d={describeArc(cx, cy, r, startAngle, endAngle)}
                    fill={seg.color}
                    stroke="#0f0e17"
                    strokeWidth="2"
                    opacity={0.9}
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#0f0e17"
                    fontFamily="'Press Start 2P', monospace"
                    fontSize="10"
                    fontWeight="bold"
                    transform={`rotate(${labelAngle}, ${labelPos.x}, ${labelPos.y})`}
                  >
                    {seg.value}
                  </text>
                </g>
              );
            })}

            {/* Center circle */}
            <circle cx={cx} cy={cy} r={22} fill="#1a1a2e" stroke="#2a2a4a" strokeWidth="3" />
            <circle cx={cx} cy={cy} r={10} fill="#f9d71c" />
          </svg>
        </motion.div>
      </div>

      {/* Result Display */}
      {result !== null && (
        <div className="game-panel px-6 py-3 text-center">
          <p className="font-body text-cream/60 text-sm">You won</p>
          <p className="font-heading text-gold text-lg mt-1">
            {result} XP
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="font-body text-crimson text-sm text-center">{error}</p>
      )}

      {/* Spin Button */}
      <button
        onClick={handleSpin}
        disabled={spinning || disabled}
        className={`game-btn game-btn-gold text-base px-10 py-3 ${
          spinning || disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {spinning ? 'SPINNING...' : 'SPIN!'}
      </button>
    </div>
  );
}
