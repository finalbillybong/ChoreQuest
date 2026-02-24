/* ── Head shapes ──
   Each head now includes small ears for a more complete look. */

function HeadRound({ color }) {
  return (
    <>
      <ellipse cx="9.5" cy="14" rx="1.2" ry="1.5" fill={color} opacity="0.85" />
      <ellipse cx="22.5" cy="14" rx="1.2" ry="1.5" fill={color} opacity="0.85" />
      <ellipse cx="16" cy="14" rx="7" ry="8" fill={color} />
    </>
  );
}

function HeadOval({ color }) {
  return (
    <>
      <ellipse cx="10.5" cy="14" rx="1" ry="1.3" fill={color} opacity="0.85" />
      <ellipse cx="21.5" cy="14" rx="1" ry="1.3" fill={color} opacity="0.85" />
      <ellipse cx="16" cy="14" rx="6" ry="9" fill={color} />
    </>
  );
}

function HeadSquare({ color }) {
  return (
    <>
      <ellipse cx="9.5" cy="14" rx="1" ry="1.3" fill={color} opacity="0.85" />
      <ellipse cx="22.5" cy="14" rx="1" ry="1.3" fill={color} opacity="0.85" />
      <rect x="9" y="6" width="14" height="16" rx="3" fill={color} />
    </>
  );
}

function HeadDiamond({ color }) {
  return (
    <>
      <ellipse cx="9.5" cy="14" rx="1" ry="1.2" fill={color} opacity="0.85" />
      <ellipse cx="22.5" cy="14" rx="1" ry="1.2" fill={color} opacity="0.85" />
      <polygon points="16,5 23,14 16,23 9,14" fill={color} />
    </>
  );
}

function HeadHeart({ color }) {
  return (
    <>
      <ellipse cx="8.5" cy="12" rx="1" ry="1.2" fill={color} opacity="0.85" />
      <ellipse cx="23.5" cy="12" rx="1" ry="1.2" fill={color} opacity="0.85" />
      <path
        d="M16,22 C16,22 8,16 8,11 C8,8 10,6 13,6 C14.5,6 15.5,7 16,8 C16.5,7 17.5,6 19,6 C22,6 24,8 24,11 C24,16 16,22 16,22Z"
        fill={color}
      />
    </>
  );
}

function HeadLong({ color }) {
  return (
    <>
      <ellipse cx="10.5" cy="13" rx="1" ry="1.3" fill={color} opacity="0.85" />
      <ellipse cx="21.5" cy="13" rx="1" ry="1.3" fill={color} opacity="0.85" />
      <ellipse cx="16" cy="13" rx="6" ry="10" fill={color} />
    </>
  );
}

function HeadTriangle({ color }) {
  return (
    <>
      <ellipse cx="9" cy="18" rx="1" ry="1.2" fill={color} opacity="0.85" />
      <ellipse cx="23" cy="18" rx="1" ry="1.2" fill={color} opacity="0.85" />
      <path d="M16,5 L24,22 L8,22 Z" fill={color} />
    </>
  );
}

function HeadPear({ color }) {
  return (
    <>
      <ellipse cx="9.5" cy="16" rx="1" ry="1.3" fill={color} opacity="0.85" />
      <ellipse cx="22.5" cy="16" rx="1" ry="1.3" fill={color} opacity="0.85" />
      <path
        d="M13,6 Q10,6 9,10 Q8,16 10,20 Q12,23 16,23 Q20,23 22,20 Q24,16 23,10 Q22,6 19,6 Q16,5 13,6Z"
        fill={color}
      />
    </>
  );
}

function HeadWide({ color }) {
  return (
    <>
      <ellipse cx="7.5" cy="14" rx="1.2" ry="1.3" fill={color} opacity="0.85" />
      <ellipse cx="24.5" cy="14" rx="1.2" ry="1.3" fill={color} opacity="0.85" />
      <ellipse cx="16" cy="14" rx="9" ry="7" fill={color} />
    </>
  );
}

export const HEAD_MAP = {
  round: HeadRound,
  oval: HeadOval,
  square: HeadSquare,
  diamond: HeadDiamond,
  heart: HeadHeart,
  long: HeadLong,
  triangle: HeadTriangle,
  pear: HeadPear,
  wide: HeadWide,
};
