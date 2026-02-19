const SIZES = {
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

const HEAD_MAP = {
  round: HeadRound,
  oval: HeadOval,
  square: HeadSquare,
  diamond: HeadDiamond,
  heart: HeadHeart,
  long: HeadLong,
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

const EYES_MAP = {
  normal: EyesNormal,
  happy: EyesHappy,
  wide: EyesWide,
  sleepy: EyesSleepy,
  wink: EyesWink,
  angry: EyesAngry,
  dot: EyesDot,
  star: EyesStar,
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

const MOUTH_MAP = {
  smile: MouthSmile,
  grin: MouthGrin,
  neutral: MouthNeutral,
  open: MouthOpen,
  tongue: MouthTongue,
  frown: MouthFrown,
  surprised: MouthSurprised,
  smirk: MouthSmirk,
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

function SvgAvatar({ config, size }) {
  const bgColor = config.bg_color || '#1a1a2e';
  const headColor = config.head_color || '#ffcc99';
  const hairColor = config.hair_color || '#4a3728';
  const eyeColor = config.eye_color || '#333333';
  const mouthColor = config.mouth_color || '#cc6666';
  const bodyColor = config.body_color || hairColor;

  const headShape = config.head || 'round';
  const hairStyle = config.hair || config.hair_style || 'short';
  const eyeStyle = config.eyes || 'normal';
  const mouthStyle = config.mouth || 'smile';
  const bodyShape = config.body || 'regular';

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
      {/* Neck */}
      <rect x="14" y="20" width="4" height="4" fill={headColor} />

      {/* Body / Shirt */}
      {renderBody(bodyShape, bodyColor)}

      {/* Head */}
      <HeadComponent color={headColor} />

      {/* Eyes */}
      <EyesComponent color={eyeColor} />

      {/* Mouth */}
      <MouthComponent color={mouthColor} />

      {/* Hair (rendered last so it's on top) */}
      {renderHair(hairStyle, hairColor)}
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
