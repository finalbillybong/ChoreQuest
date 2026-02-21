const SIZES = {
  xs: 24,
  sm: 32,
  md: 64,
  lg: 128,
};

const AVATAR_COLORS = [
  '#f9d71c', '#2de2a6', '#b388ff', '#64dfdf',
  '#ff4444', '#ff8c42', '#ff6b9d', '#45b7d1',
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getColor(name) {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
}

/* ── Head shapes ── */
function HeadRound({ color }) {
  return <ellipse cx="16" cy="14" rx="7" ry="8" fill={color} />;
}
function HeadOval({ color }) {
  return <ellipse cx="16" cy="14" rx="6" ry="9" fill={color} />;
}
function HeadSquare({ color }) {
  return <rect x="9" y="6" width="14" height="16" rx="3" fill={color} />;
}
function HeadDiamond({ color }) {
  return <polygon points="16,5 23,14 16,23 9,14" fill={color} />;
}
function HeadHeart({ color }) {
  return (
    <path
      d="M16,22 C16,22 8,16 8,11 C8,8 10,6 13,6 C14.5,6 15.5,7 16,8 C16.5,7 17.5,6 19,6 C22,6 24,8 24,11 C24,16 16,22 16,22Z"
      fill={color}
    />
  );
}
function HeadLong({ color }) {
  return <ellipse cx="16" cy="13" rx="6" ry="10" fill={color} />;
}
function HeadTriangle({ color }) {
  return <polygon points="16,5 24,22 8,22" rx="2" fill={color} />;
}
function HeadPear({ color }) {
  return (
    <path
      d="M13,6 Q10,6 9,10 Q8,16 10,20 Q12,23 16,23 Q20,23 22,20 Q24,16 23,10 Q22,6 19,6 Q16,5 13,6Z"
      fill={color}
    />
  );
}
function HeadWide({ color }) {
  return <ellipse cx="16" cy="14" rx="9" ry="7" fill={color} />;
}

const HEAD_MAP = {
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

/* ── Eye styles ── */
function EyesNormal({ color }) {
  return (
    <>
      <rect x="11.5" y="13" width="2.5" height="2.5" rx="1" fill={color} />
      <rect x="18" y="13" width="2.5" height="2.5" rx="1" fill={color} />
    </>
  );
}
function EyesHappy({ color }) {
  return (
    <>
      <path d="M11.5,14 Q12.75,12 14,14" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M18,14 Q19.25,12 20.5,14" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  );
}
function EyesWide({ color }) {
  return (
    <>
      <circle cx="12.75" cy="13.5" r="2" fill="white" />
      <circle cx="12.75" cy="13.5" r="1.2" fill={color} />
      <circle cx="19.25" cy="13.5" r="2" fill="white" />
      <circle cx="19.25" cy="13.5" r="1.2" fill={color} />
    </>
  );
}
function EyesSleepy({ color }) {
  return (
    <>
      <line x1="11" y1="14" x2="14" y2="14" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="18" y1="14" x2="21" y2="14" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </>
  );
}
function EyesWink({ color }) {
  return (
    <>
      <rect x="11.5" y="13" width="2.5" height="2.5" rx="1" fill={color} />
      <path d="M18,14 Q19.25,12 20.5,14" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  );
}
function EyesAngry({ color }) {
  return (
    <>
      <line x1="11" y1="12" x2="14" y2="13" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
      <rect x="11.5" y="13.5" width="2.5" height="2" rx="1" fill={color} />
      <line x1="21" y1="12" x2="18" y2="13" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
      <rect x="18" y="13.5" width="2.5" height="2" rx="1" fill={color} />
    </>
  );
}
function EyesDot({ color }) {
  return (
    <>
      <circle cx="12.75" cy="14" r="1" fill={color} />
      <circle cx="19.25" cy="14" r="1" fill={color} />
    </>
  );
}
function EyesStar({ color }) {
  return (
    <>
      <text x="12.75" y="15.5" textAnchor="middle" fill={color} fontSize="5" fontFamily="sans-serif">★</text>
      <text x="19.25" y="15.5" textAnchor="middle" fill={color} fontSize="5" fontFamily="sans-serif">★</text>
    </>
  );
}
function EyesGlasses({ color }) {
  return (
    <>
      <circle cx="12.75" cy="13.5" r="2.5" fill="none" stroke={color} strokeWidth="0.8" />
      <circle cx="19.25" cy="13.5" r="2.5" fill="none" stroke={color} strokeWidth="0.8" />
      <line x1="15.25" y1="13.5" x2="16.75" y2="13.5" stroke={color} strokeWidth="0.8" />
      <line x1="10.25" y1="13.5" x2="9" y2="12.5" stroke={color} strokeWidth="0.6" />
      <line x1="21.75" y1="13.5" x2="23" y2="12.5" stroke={color} strokeWidth="0.6" />
      <circle cx="12.75" cy="13.5" r="1" fill={color} />
      <circle cx="19.25" cy="13.5" r="1" fill={color} />
    </>
  );
}
function EyesSunglasses({ color }) {
  return (
    <>
      <rect x="10" y="12" width="5.5" height="3.5" rx="1" fill={color} />
      <rect x="16.5" y="12" width="5.5" height="3.5" rx="1" fill={color} />
      <line x1="15.5" y1="13.5" x2="16.5" y2="13.5" stroke={color} strokeWidth="0.8" />
      <line x1="10" y1="13" x2="8.5" y2="12" stroke={color} strokeWidth="0.7" />
      <line x1="22" y1="13" x2="23.5" y2="12" stroke={color} strokeWidth="0.7" />
    </>
  );
}
function EyesEyePatch({ color }) {
  return (
    <>
      <rect x="11.5" y="13" width="2.5" height="2.5" rx="1" fill={color} />
      <ellipse cx="19.25" cy="13.5" rx="3" ry="2.5" fill="#1a1a2e" />
      <line x1="9" y1="10" x2="22" y2="10" stroke="#1a1a2e" strokeWidth="0.6" />
    </>
  );
}
function EyesCrying({ color }) {
  return (
    <>
      <rect x="11.5" y="13" width="2.5" height="2.5" rx="1" fill={color} />
      <rect x="18" y="13" width="2.5" height="2.5" rx="1" fill={color} />
      <ellipse cx="13" cy="17" rx="0.6" ry="1" fill="#64dfdf" opacity="0.7" />
      <ellipse cx="19.5" cy="17" rx="0.6" ry="1" fill="#64dfdf" opacity="0.7" />
    </>
  );
}
function EyesHeartEyes({ color }) {
  return (
    <>
      <path d="M12.75,12.5 L11.5,13.5 L12.75,15 L14,13.5Z" fill={color} />
      <path d="M19.25,12.5 L18,13.5 L19.25,15 L20.5,13.5Z" fill={color} />
    </>
  );
}
function EyesDizzy({ color }) {
  return (
    <>
      <line x1="11" y1="12" x2="14.5" y2="15.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <line x1="14.5" y1="12" x2="11" y2="15.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <line x1="17.5" y1="12" x2="21" y2="15.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <line x1="21" y1="12" x2="17.5" y2="15.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
    </>
  );
}
function EyesClosed({ color }) {
  return (
    <>
      <path d="M11,14 Q12.75,15.5 14.5,14" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M17.5,14 Q19.25,15.5 21,14" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  );
}

const EYES_MAP = {
  normal: EyesNormal,
  happy: EyesHappy,
  wide: EyesWide,
  sleepy: EyesSleepy,
  wink: EyesWink,
  angry: EyesAngry,
  dot: EyesDot,
  star: EyesStar,
  glasses: EyesGlasses,
  sunglasses: EyesSunglasses,
  eye_patch: EyesEyePatch,
  crying: EyesCrying,
  heart_eyes: EyesHeartEyes,
  dizzy: EyesDizzy,
  closed: EyesClosed,
};

/* ── Mouth styles ── */
function MouthSmile({ color }) {
  return <path d="M13,17.5 Q16,20 19,17.5" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />;
}
function MouthGrin({ color }) {
  return (
    <>
      <path d="M12.5,17 Q16,21 19.5,17" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M13,17.5 Q16,19.5 19,17.5" fill="white" opacity="0.6" />
    </>
  );
}
function MouthNeutral({ color }) {
  return <line x1="13.5" y1="18" x2="18.5" y2="18" stroke={color} strokeWidth="1" strokeLinecap="round" />;
}
function MouthOpen({ color }) {
  return <ellipse cx="16" cy="18" rx="2" ry="1.5" fill={color} />;
}
function MouthTongue({ color }) {
  return (
    <>
      <path d="M13,17.5 Q16,20 19,17.5" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />
      <ellipse cx="16" cy="19" rx="1.5" ry="1" fill="#ff6b9d" />
    </>
  );
}
function MouthFrown({ color }) {
  return <path d="M13,19 Q16,16 19,19" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />;
}
function MouthSurprised({ color }) {
  return <circle cx="16" cy="18.5" r="1.5" fill={color} />;
}
function MouthSmirk({ color }) {
  return <path d="M13,18 Q15,18 19,16.5" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />;
}
function MouthBraces({ color }) {
  return (
    <>
      <path d="M12.5,17 Q16,20.5 19.5,17" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />
      <line x1="13" y1="18" x2="19" y2="18" stroke="#c0c0c0" strokeWidth="0.5" />
      {[13.5, 15, 16.5, 18].map((x) => (
        <rect key={x} x={x - 0.3} y={17.6} width="0.6" height="0.8" fill="#c0c0c0" rx="0.1" />
      ))}
    </>
  );
}
function MouthVampire({ color }) {
  return (
    <>
      <path d="M13,17.5 Q16,20 19,17.5" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />
      <polygon points="14,17.5 14.5,20 15,17.5" fill="white" />
      <polygon points="17,17.5 17.5,20 18,17.5" fill="white" />
    </>
  );
}
function MouthWhistle({ color }) {
  return <circle cx="16" cy="18" r="1" fill={color} />;
}
function MouthMask({ color }) {
  return (
    <path
      d="M10,16 Q10,21 16,21 Q22,21 22,16 L22,15.5 Q16,17 10,15.5Z"
      fill={color}
      opacity="0.9"
    />
  );
}
function MouthBeard({ color }) {
  return (
    <>
      <path d="M13,17.5 Q16,20 19,17.5" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M10,17 Q10,24 16,25 Q22,24 22,17 Q19,18 16,18 Q13,18 10,17Z" fill={color} opacity="0.8" />
    </>
  );
}
function MouthMoustache({ color }) {
  return (
    <>
      <line x1="14" y1="18.5" x2="18" y2="18.5" stroke={color} strokeWidth="0.6" strokeLinecap="round" />
      <path d="M11,17 Q13,16 16,17 Q19,16 21,17" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  );
}

const MOUTH_MAP = {
  smile: MouthSmile,
  grin: MouthGrin,
  neutral: MouthNeutral,
  open: MouthOpen,
  tongue: MouthTongue,
  frown: MouthFrown,
  surprised: MouthSurprised,
  smirk: MouthSmirk,
  braces: MouthBraces,
  vampire: MouthVampire,
  whistle: MouthWhistle,
  mask: MouthMask,
  beard: MouthBeard,
  moustache: MouthMoustache,
};

/* ── Hair styles ── */
function renderHair(style, color) {
  switch (style) {
    case 'short':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <rect x="8.5" y="8" width="3" height="5" rx="1" fill={color} />
          <rect x="20.5" y="8" width="3" height="5" rx="1" fill={color} />
        </>
      );
    case 'long':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <rect x="8" y="8" width="3.5" height="14" rx="1.5" fill={color} />
          <rect x="20.5" y="8" width="3.5" height="14" rx="1.5" fill={color} />
        </>
      );
    case 'spiky':
      return (
        <>
          <polygon points="10,10 13,3 15,9" fill={color} />
          <polygon points="14,9 16,2 18,9" fill={color} />
          <polygon points="17,10 20,3 22,10" fill={color} />
          <ellipse cx="16" cy="9" rx="7" ry="3.5" fill={color} />
        </>
      );
    case 'curly':
      return (
        <>
          <circle cx="10" cy="9" r="3" fill={color} />
          <circle cx="16" cy="7" r="3.5" fill={color} />
          <circle cx="22" cy="9" r="3" fill={color} />
          <circle cx="8.5" cy="13" r="2.5" fill={color} />
          <circle cx="23.5" cy="13" r="2.5" fill={color} />
        </>
      );
    case 'mohawk':
      return <rect x="13" y="2" width="6" height="8" rx="2" fill={color} />;
    case 'buzz':
      return <ellipse cx="16" cy="8.5" rx="7.5" ry="3" fill={color} opacity="0.7" />;
    case 'ponytail':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <rect x="20" y="7" width="3" height="3" rx="1" fill={color} />
          <rect x="22" y="9" width="2.5" height="10" rx="1" fill={color} />
        </>
      );
    case 'bun':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <circle cx="16" cy="4" r="3.5" fill={color} />
        </>
      );
    case 'pigtails':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <circle cx="7" cy="11" r="3" fill={color} />
          <circle cx="25" cy="11" r="3" fill={color} />
        </>
      );
    case 'afro':
      return <ellipse cx="16" cy="10" rx="10" ry="8" fill={color} />;
    case 'braids':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <rect x="8" y="8" width="2.5" height="16" rx="1" fill={color} />
          <rect x="21.5" y="8" width="2.5" height="16" rx="1" fill={color} />
          {[10, 13, 16, 19].map((y) => (
            <g key={y}>
              <line x1="8.5" y1={y} x2="10" y2={y} stroke={color} strokeWidth="0.3" opacity="0.5" />
              <line x1="22" y1={y} x2="23.5" y2={y} stroke={color} strokeWidth="0.3" opacity="0.5" />
            </g>
          ))}
        </>
      );
    case 'wavy':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <path d="M8.5,10 Q9,14 8,17 Q9,15 10,18" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M23.5,10 Q23,14 24,17 Q23,15 22,18" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      );
    case 'side_part':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <rect x="8" y="7" width="5" height="7" rx="1.5" fill={color} />
          <rect x="20.5" y="8" width="3" height="4" rx="1" fill={color} />
        </>
      );
    case 'fade':
      return (
        <>
          <ellipse cx="16" cy="8" rx="7" ry="3.5" fill={color} />
          <rect x="9" y="8" width="2" height="4" rx="0.5" fill={color} opacity="0.5" />
          <rect x="21" y="8" width="2" height="4" rx="0.5" fill={color} opacity="0.5" />
        </>
      );
    case 'dreadlocks':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          {[9, 11, 13, 15, 17, 19, 21, 23].map((x) => (
            <rect key={x} x={x - 0.8} y="8" width="1.6" height={10 + (x % 3) * 2} rx="0.8" fill={color} />
          ))}
        </>
      );
    case 'bob':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <rect x="8" y="8" width="4" height="9" rx="2" fill={color} />
          <rect x="20" y="8" width="4" height="9" rx="2" fill={color} />
        </>
      );
    case 'shoulder':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <rect x="8" y="8" width="3.5" height="12" rx="1.5" fill={color} />
          <rect x="20.5" y="8" width="3.5" height="12" rx="1.5" fill={color} />
          <path d="M9,20 Q10,21 11,20" fill={color} />
          <path d="M21,20 Q22,21 23,20" fill={color} />
        </>
      );
    case 'undercut':
      return (
        <>
          <ellipse cx="16" cy="8" rx="7" ry="3" fill={color} />
          <rect x="10" y="6" width="12" height="4" rx="2" fill={color} />
        </>
      );
    case 'twin_buns':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <circle cx="10" cy="5" r="3" fill={color} />
          <circle cx="22" cy="5" r="3" fill={color} />
        </>
      );
    case 'none':
      return null;
    default:
      return <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />;
  }
}

/* ── Body shapes ── */
function renderBody(shape, color) {
  switch (shape) {
    case 'slim':
      return <rect x="11" y="22" width="10" height="10" rx="2" fill={color} />;
    case 'broad':
      return <rect x="7" y="22" width="18" height="10" rx="3" fill={color} />;
    case 'regular':
    default:
      return <rect x="9" y="22" width="14" height="10" rx="2" fill={color} />;
  }
}

/* ── Outfit patterns (overlaid on body) ── */
function renderOutfitPattern(style, bodyShape) {
  // Get body bounds based on shape
  const bounds = bodyShape === 'slim'
    ? { x: 11, w: 10 }
    : bodyShape === 'broad'
    ? { x: 7, w: 18 }
    : { x: 9, w: 14 };

  switch (style) {
    case 'stripes':
      return (
        <g opacity="0.3">
          {[24, 26, 28].map((y) => (
            <line key={y} x1={bounds.x + 1} y1={y} x2={bounds.x + bounds.w - 1} y2={y}
              stroke="white" strokeWidth="0.8" />
          ))}
        </g>
      );
    case 'stars':
      return (
        <g opacity="0.3">
          <text x="13" y="27" fill="white" fontSize="3" fontFamily="sans-serif">★</text>
          <text x="17" y="29" fill="white" fontSize="3" fontFamily="sans-serif">★</text>
        </g>
      );
    case 'camo': {
      const cx = bounds.x + bounds.w / 2;
      return (
        <g opacity="0.2">
          <circle cx={cx - 2} cy="25" r="1.5" fill="#2d4a2d" />
          <circle cx={cx + 2} cy="27" r="2" fill="#3d5a3d" />
          <circle cx={cx - 1} cy="29" r="1.2" fill="#2d4a2d" />
        </g>
      );
    }
    case 'tie_dye': {
      const cx = bounds.x + bounds.w / 2;
      return (
        <g opacity="0.25">
          <circle cx={cx} cy="26" r="3" fill="#ff6b9d" />
          <circle cx={cx - 2} cy="28" r="2" fill="#64dfdf" />
          <circle cx={cx + 2} cy="25" r="1.5" fill="#f9d71c" />
        </g>
      );
    }
    case 'plaid':
      return (
        <g opacity="0.2">
          {[24, 27, 30].map((y) => (
            <line key={`h${y}`} x1={bounds.x + 1} y1={y} x2={bounds.x + bounds.w - 1} y2={y}
              stroke="white" strokeWidth="0.4" />
          ))}
          {[bounds.x + 3, bounds.x + bounds.w / 2, bounds.x + bounds.w - 3].map((x) => (
            <line key={`v${x}`} x1={x} y1="23" x2={x} y2="31"
              stroke="white" strokeWidth="0.4" />
          ))}
        </g>
      );
    case 'none':
    default:
      return null;
  }
}

/* ── Face extras ── */
function renderFaceExtra(style) {
  switch (style) {
    case 'freckles':
      return (
        <g opacity="0.4">
          {[[11, 16], [13, 16.5], [12, 17.5], [19, 16], [21, 16.5], [20, 17.5]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="0.4" fill="#8b4513" />
          ))}
        </g>
      );
    case 'blush':
      return (
        <>
          <ellipse cx="11" cy="16.5" rx="2" ry="1" fill="#ff6b9d" opacity="0.25" />
          <ellipse cx="21" cy="16.5" rx="2" ry="1" fill="#ff6b9d" opacity="0.25" />
        </>
      );
    case 'face_paint':
      return (
        <g opacity="0.5">
          <line x1="10" y1="14" x2="13" y2="15" stroke="#e74c3c" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="10" y1="15" x2="13" y2="16" stroke="#3b82f6" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="19" y1="15" x2="22" y2="14" stroke="#e74c3c" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="19" y1="16" x2="22" y2="15" stroke="#3b82f6" strokeWidth="0.8" strokeLinecap="round" />
        </g>
      );
    case 'scar':
      return (
        <g opacity="0.5">
          <line x1="19" y1="11" x2="21" y2="16" stroke="#cc6666" strokeWidth="0.6" strokeLinecap="round" />
          <line x1="19.5" y1="13" x2="21" y2="13" stroke="#cc6666" strokeWidth="0.4" strokeLinecap="round" />
          <line x1="20" y1="14.5" x2="21.3" y2="14.2" stroke="#cc6666" strokeWidth="0.4" strokeLinecap="round" />
        </g>
      );
    case 'bandage':
      return (
        <>
          <rect x="18" y="11" width="4" height="3" rx="0.5" fill="#f5d6b8" />
          <line x1="19" y1="12" x2="21" y2="12" stroke="#cc6666" strokeWidth="0.3" />
          <line x1="19" y1="13" x2="21" y2="13" stroke="#cc6666" strokeWidth="0.3" />
        </>
      );
    case 'stickers':
      return (
        <g opacity="0.7">
          <text x="21" y="12" fill="#f9d71c" fontSize="3" fontFamily="sans-serif">★</text>
          <circle cx="10.5" cy="16" r="1" fill="#ff6b9d" opacity="0.6" />
        </g>
      );
    case 'none':
    default:
      return null;
  }
}

/* ── Hats ── */
function renderHat(style, color) {
  switch (style) {
    case 'crown':
      return (
        <g>
          <polygon points="10,8 11,4 13,7 16,3 19,7 21,4 22,8" fill={color} />
          <rect x="10" y="7" width="12" height="2" rx="0.5" fill={color} />
        </g>
      );
    case 'wizard':
      return (
        <g>
          <polygon points="16,0 10,9 22,9" fill={color} />
          <ellipse cx="16" cy="9" rx="7" ry="1.5" fill={color} />
          <text x="16" y="7" textAnchor="middle" fill="#f9d71c" fontSize="3" fontFamily="sans-serif">★</text>
        </g>
      );
    case 'beanie':
      return (
        <g>
          <ellipse cx="16" cy="8" rx="7.5" ry="4" fill={color} />
          <rect x="8.5" y="7" width="15" height="2.5" rx="1" fill={color} opacity="0.7" />
          <circle cx="16" cy="4" r="1.2" fill={color} />
        </g>
      );
    case 'cap':
      return (
        <g>
          <ellipse cx="16" cy="8" rx="7.5" ry="3.5" fill={color} />
          <ellipse cx="10" cy="9" rx="5" ry="1.2" fill={color} />
        </g>
      );
    case 'pirate':
      return (
        <g>
          <ellipse cx="16" cy="7.5" rx="8" ry="3" fill="#1a1a2e" />
          <rect x="8" y="7" width="16" height="1.5" fill={color} />
          <text x="16" y="7" textAnchor="middle" fill="white" fontSize="3" fontFamily="sans-serif">☠</text>
        </g>
      );
    case 'headphones':
      return (
        <g>
          <path d="M9,12 Q9,5 16,5 Q23,5 23,12" stroke={color} strokeWidth="1.5" fill="none" />
          <rect x="7" y="11" width="3" height="4" rx="1" fill={color} />
          <rect x="22" y="11" width="3" height="4" rx="1" fill={color} />
        </g>
      );
    case 'tiara':
      return (
        <g>
          <path d="M10,8 L12,5 L14,7 L16,4 L18,7 L20,5 L22,8" stroke={color} strokeWidth="0.8" fill="none" />
          <circle cx="16" cy="4" r="0.8" fill={color} />
          <rect x="10" y="7.5" width="12" height="1" rx="0.3" fill={color} />
        </g>
      );
    case 'horns':
      return (
        <g>
          <path d="M10,10 Q8,4 11,5" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M22,10 Q24,4 21,5" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'bunny_ears':
      return (
        <g>
          <ellipse cx="12" cy="3" rx="2" ry="5" fill={color} />
          <ellipse cx="12" cy="3" rx="1" ry="4" fill="#ffb6c1" opacity="0.5" />
          <ellipse cx="20" cy="3" rx="2" ry="5" fill={color} />
          <ellipse cx="20" cy="3" rx="1" ry="4" fill="#ffb6c1" opacity="0.5" />
        </g>
      );
    case 'cat_ears':
      return (
        <g>
          <polygon points="9,9 10,2 14,8" fill={color} />
          <polygon points="10,8 11,4 13,8" fill="#ffb6c1" opacity="0.5" />
          <polygon points="23,9 22,2 18,8" fill={color} />
          <polygon points="22,8 21,4 19,8" fill="#ffb6c1" opacity="0.5" />
        </g>
      );
    case 'halo':
      return (
        <ellipse cx="16" cy="4" rx="6" ry="1.5" fill="none" stroke="#f9d71c" strokeWidth="1" opacity="0.8" />
      );
    case 'viking':
      return (
        <g>
          <ellipse cx="16" cy="8" rx="8" ry="3.5" fill={color} />
          <path d="M8,8 Q6,3 9,5" stroke="#c0c0c0" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M24,8 Q26,3 23,5" stroke="#c0c0c0" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <rect x="8" y="7" width="16" height="2" rx="0.5" fill={color} opacity="0.8" />
        </g>
      );
    case 'none':
    default:
      return null;
  }
}

/* ── Accessories ── */
function renderAccessory(style, color) {
  switch (style) {
    case 'scarf':
      return (
        <g>
          <rect x="9" y="20" width="14" height="3" rx="1" fill={color} />
          <rect x="9" y="20" width="3" height="6" rx="1" fill={color} />
        </g>
      );
    case 'necklace':
      return (
        <g>
          <path d="M12,22 Q16,25 20,22" stroke={color} strokeWidth="0.6" fill="none" />
          <circle cx="16" cy="24" r="1" fill={color} />
        </g>
      );
    case 'bow_tie':
      return (
        <g>
          <polygon points="14,22 16,23 14,24" fill={color} />
          <polygon points="18,22 16,23 18,24" fill={color} />
          <circle cx="16" cy="23" r="0.5" fill={color} />
        </g>
      );
    case 'cape':
      return (
        <g opacity="0.7">
          <path d="M9,22 Q7,28 9,32 L23,32 Q25,28 23,22" fill={color} />
        </g>
      );
    case 'wings':
      return (
        <g opacity="0.6">
          <path d="M9,24 Q4,20 5,26 Q6,29 9,28" fill={color} />
          <path d="M23,24 Q28,20 27,26 Q26,29 23,28" fill={color} />
        </g>
      );
    case 'shield':
      return (
        <g>
          <path d="M3,20 L3,26 Q3,30 6,30 L6,20Z" fill={color} />
          <line x1="4.5" y1="22" x2="4.5" y2="28" stroke="white" strokeWidth="0.5" opacity="0.4" />
        </g>
      );
    case 'sword':
      return (
        <g>
          <rect x="26" y="16" width="1" height="10" rx="0.3" fill="#c0c0c0" />
          <rect x="24.5" y="25" width="4" height="1.5" rx="0.5" fill={color} />
          <rect x="26" y="26" width="1" height="3" rx="0.3" fill={color} />
        </g>
      );
    case 'none':
    default:
      return null;
  }
}

/* ── Pets (bottom-right) ── */
function renderPet(style, color) {
  switch (style) {
    case 'cat':
      return (
        <g transform="translate(24,26)">
          <ellipse cx="3" cy="3" rx="2.5" ry="2" fill={color} />
          <polygon points="1,1 1.5,-1 3,1" fill={color} />
          <polygon points="4,1 4.5,-1 5,1" fill={color} />
          <circle cx="2" cy="3" r="0.4" fill="#333" />
          <circle cx="4" cy="3" r="0.4" fill="#333" />
          <path d="M4.5,4 Q6,4 6,3" stroke={color} strokeWidth="0.5" fill="none" />
        </g>
      );
    case 'dog':
      return (
        <g transform="translate(24,26)">
          <ellipse cx="3" cy="3" rx="2.5" ry="2" fill={color} />
          <ellipse cx="0.5" cy="1.5" rx="1.2" ry="1.8" fill={color} />
          <ellipse cx="5.5" cy="1.5" rx="1.2" ry="1.8" fill={color} />
          <circle cx="2" cy="3" r="0.4" fill="#333" />
          <circle cx="4" cy="3" r="0.4" fill="#333" />
          <ellipse cx="3" cy="3.8" rx="0.5" ry="0.3" fill="#333" />
        </g>
      );
    case 'dragon':
      return (
        <g transform="translate(23,24)">
          <ellipse cx="4" cy="4" rx="3" ry="2.5" fill={color} />
          <polygon points="2,2 1,0 3,2" fill={color} />
          <polygon points="5,2 6,0 7,2" fill={color} />
          <circle cx="3" cy="3.5" r="0.4" fill="#f9d71c" />
          <circle cx="5" cy="3.5" r="0.4" fill="#f9d71c" />
          <path d="M6,4 Q8,3 8,5" stroke={color} strokeWidth="0.8" fill="none" />
          <polygon points="1,3 -1,2 0,4" fill={color} opacity="0.6" />
          <polygon points="7,3 9,2 8,4" fill={color} opacity="0.6" />
        </g>
      );
    case 'owl':
      return (
        <g transform="translate(24,25)">
          <ellipse cx="3" cy="3.5" rx="2.5" ry="3" fill={color} />
          <polygon points="1.5,1 3,0 4.5,1" fill={color} />
          <circle cx="2" cy="3" r="1" fill="white" />
          <circle cx="4" cy="3" r="1" fill="white" />
          <circle cx="2" cy="3" r="0.5" fill="#333" />
          <circle cx="4" cy="3" r="0.5" fill="#333" />
          <polygon points="2.5,4 3,4.5 3.5,4" fill="#f39c12" />
        </g>
      );
    case 'bunny':
      return (
        <g transform="translate(24,26)">
          <ellipse cx="3" cy="3" rx="2.5" ry="2" fill={color} />
          <ellipse cx="2" cy="0" rx="0.8" ry="2.5" fill={color} />
          <ellipse cx="2" cy="0" rx="0.4" ry="2" fill="#ffb6c1" opacity="0.4" />
          <ellipse cx="4" cy="0" rx="0.8" ry="2.5" fill={color} />
          <ellipse cx="4" cy="0" rx="0.4" ry="2" fill="#ffb6c1" opacity="0.4" />
          <circle cx="2" cy="2.8" r="0.3" fill="#333" />
          <circle cx="4" cy="2.8" r="0.3" fill="#333" />
          <ellipse cx="3" cy="3.3" rx="0.3" ry="0.2" fill="#ff6b9d" />
        </g>
      );
    case 'phoenix':
      return (
        <g transform="translate(23,24)">
          <ellipse cx="4" cy="4" rx="2.5" ry="2" fill={color} />
          <polygon points="2,3 0,1 3,3" fill="#f39c12" />
          <polygon points="5,2 6,0 7,3" fill="#f39c12" />
          <circle cx="3" cy="3.5" r="0.4" fill="#333" />
          <circle cx="5" cy="3.5" r="0.4" fill="#333" />
          <polygon points="3.5,4.5 4,5.5 4.5,4.5" fill="#f39c12" />
          <path d="M1,5 Q0,7 2,6" stroke="#ff4444" strokeWidth="0.6" fill="none" />
          <path d="M7,5 Q8,7 6,6" stroke="#ff4444" strokeWidth="0.6" fill="none" />
        </g>
      );
    case 'none':
    default:
      return null;
  }
}

/* ── Main SVG avatar ── */
function SvgAvatar({ config, size }) {
  const bgColor = config.bg_color || '#1a1a2e';
  const headColor = config.head_color || '#ffcc99';
  const hairColor = config.hair_color || '#4a3728';
  const eyeColor = config.eye_color || '#333333';
  const mouthColor = config.mouth_color || '#cc6666';
  const bodyColor = config.body_color || hairColor;
  const hatColor = config.hat_color || '#f39c12';
  const accessoryColor = config.accessory_color || '#3b82f6';
  const petColor = config.pet_color || '#8b4513';

  const headShape = config.head || 'round';
  const hairStyle = config.hair || config.hair_style || 'short';
  const eyeStyle = config.eyes || 'normal';
  const mouthStyle = config.mouth || 'smile';
  const bodyShape = config.body || 'regular';
  const hatStyle = config.hat || 'none';
  const accessoryStyle = config.accessory || 'none';
  const faceExtraStyle = config.face_extra || 'none';
  const outfitPatternStyle = config.outfit_pattern || 'none';
  const petStyle = config.pet || 'none';

  const HeadComponent = HEAD_MAP[headShape] || HeadRound;
  const EyesComponent = EYES_MAP[eyeStyle] || EyesNormal;
  const MouthComponent = MOUTH_MAP[mouthStyle] || MouthSmile;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className="rounded-full"
      style={{ background: bgColor }}
    >
      {/* Accessory behind body (cape, wings) */}
      {(accessoryStyle === 'cape' || accessoryStyle === 'wings') && renderAccessory(accessoryStyle, accessoryColor)}

      {/* Neck */}
      <rect x="14" y="20" width="4" height="4" fill={headColor} />

      {/* Body / Shirt */}
      {renderBody(bodyShape, bodyColor)}
      {renderOutfitPattern(outfitPatternStyle, bodyShape)}

      {/* Head */}
      <HeadComponent color={headColor} />

      {/* Face extras (under eyes) */}
      {renderFaceExtra(faceExtraStyle)}

      {/* Eyes */}
      <EyesComponent color={eyeColor} />

      {/* Mouth */}
      <MouthComponent color={mouthColor} />

      {/* Hair */}
      {renderHair(hairStyle, hairColor)}

      {/* Hat (on top of hair) */}
      {renderHat(hatStyle, hatColor)}

      {/* Accessories (front-facing, not cape/wings) */}
      {accessoryStyle !== 'cape' && accessoryStyle !== 'wings' && accessoryStyle !== 'none' && renderAccessory(accessoryStyle, accessoryColor)}

      {/* Pet */}
      {renderPet(petStyle, petColor)}
    </svg>
  );
}

export default function AvatarDisplay({ config, size = 'md', name = '' }) {
  const px = SIZES[size] || SIZES.md;

  if (config && typeof config === 'object' && Object.keys(config).length > 0) {
    return (
      <div
        className="rounded-full overflow-hidden flex-shrink-0"
        style={{ width: px, height: px }}
      >
        <SvgAvatar config={config} size={px} />
      </div>
    );
  }

  // Fallback: colored circle with initials
  const bgColor = getColor(name);
  const initials = getInitials(name);
  const fontSize = px < 48 ? '0.65rem' : px < 96 ? '1rem' : '1.5rem';

  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: px, height: px, backgroundColor: bgColor }}
    >
      <span className="font-heading text-navy leading-none" style={{ fontSize }}>
        {initials}
      </span>
    </div>
  );
}
