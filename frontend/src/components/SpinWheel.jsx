import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import ConfettiAnimation from './ConfettiAnimation';

const SEGMENTS = [
  { value: 1, color: '#ef4444' },
  { value: 5, color: '#f59e0b' },
  { value: 2, color: '#10b981' },
  { value: 10, color: '#a855f7' },
  { value: 3, color: '#3b82f6' },
  { value: 15, color: '#f97316' },
  { value: 1, color: '#ec4899' },
  { value: 25, color: '#f59e0b' },
  { value: 2, color: '#06b6d4' },
  { value: 5, color: '#10b981' },
  { value: 3, color: '#a855f7' },
  { value: 10, color: '#ef4444' },
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

export default function SpinWheel({ availability, onSpinComplete }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState(null);
  const hasSpunRef = useRef(false);

  const canSpin = availability?.can_spin ?? true;
  const reason = availability?.reason ?? null;
  const disabled = !canSpin;

  const handleSpin = useCallback(async () => {
    if (spinning || disabled) return;

    setSpinning(true);
    setResult(null);
    setError(null);

    try {
      // Call API to get the spin result
      const data = await api('/api/spin/spin', { method: 'POST' });
      const wonPoints = data.points_won ?? data.points ?? data.result ?? 5;

      // Find segment index that matches (or pick random one with similar value)
      let targetIdx = SEGMENTS.findIndex((s) => s.value === wonPoints);
      if (targetIdx === -1) targetIdx = Math.floor(Math.random() * SEGMENTS.length);

      // Calculate target rotation
      const segmentCenter = targetIdx * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
      const fullSpins = 5 + Math.floor(Math.random() * 3);
      const targetRotation = rotation + fullSpins * 360 + (360 - segmentCenter);

      setRotation(targetRotation);

      // After animation completes, show result
      setTimeout(() => {
        setResult(wonPoints);
        setShowConfetti(true);
        setSpinning(false);
        hasSpunRef.current = true;
        onSpinComplete?.(wonPoints);
      }, 3500);
    } catch (err) {
      setError(err.message || 'Spin failed!');
      setSpinning(false);
    }
  }, [spinning, disabled, rotation, onSpinComplete]);

  const cx = 150;
  const cy = 150;
  const r = 140;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Confetti */}
      {showConfetti && (
        <ConfettiAnimation onComplete={() => setShowConfetti(false)} />
      )}

      {/* Wheel Container */}
      <div className="relative">
        {/* Pointer at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
          <div
            className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-sky"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(59,130,246,0.4))' }}
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
              stroke="#1e293b"
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
                    stroke="#0a0e1a"
                    strokeWidth="2"
                    opacity={disabled && !spinning ? 0.4 : 0.9}
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontFamily="Inter, system-ui, sans-serif"
                    fontSize="12"
                    fontWeight="800"
                    transform={`rotate(${labelAngle}, ${labelPos.x}, ${labelPos.y})`}
                  >
                    {seg.value}
                  </text>
                </g>
              );
            })}

            {/* Center circle */}
            <circle cx={cx} cy={cy} r={22} fill="#111827" stroke="#1e293b" strokeWidth="3" />
            <circle cx={cx} cy={cy} r={10} fill="#3b82f6" />
          </svg>
        </motion.div>
      </div>

      {/* Result Display */}
      {result !== null && (
        <div className="game-panel px-6 py-3 text-center">
          <p className="text-muted text-xs">You won</p>
          <p className="text-gold text-lg font-bold mt-1">
            {result} XP
          </p>
        </div>
      )}

      {/* Reason why spin is disabled */}
      {disabled && !spinning && reason && (
        <p className="text-gold text-sm text-center max-w-xs">{reason}</p>
      )}

      {/* Error */}
      {error && (
        <p className="text-crimson text-sm text-center">{error}</p>
      )}

      {/* Spin Button */}
      <button
        onClick={handleSpin}
        disabled={spinning || disabled}
        className={`game-btn game-btn-blue text-base px-10 py-3 ${
          spinning || disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {spinning ? 'SPINNING...' : disabled ? 'LOCKED' : 'SPIN!'}
      </button>
    </div>
  );
}
