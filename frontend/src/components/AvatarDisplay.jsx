import {
  HEAD_MAP,
  EYES_MAP,
  MOUTH_MAP,
  renderHair,
  renderBody,
  renderOutfitPattern,
  renderFaceExtra,
  renderHat,
  renderAccessory,
  renderPet,
} from './avatar';

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
  const petPosition = config.pet_position || 'right';

  const HeadComponent = HEAD_MAP[headShape] || HEAD_MAP.round;
  const EyesComponent = EYES_MAP[eyeStyle] || EYES_MAP.normal;
  const MouthComponent = MOUTH_MAP[mouthStyle] || MOUTH_MAP.smile;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className="avatar-svg rounded-full"
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

      {/* Mouth — pass mouthColor for items that need a tint (tongue, etc.) */}
      <MouthComponent color={mouthColor} mouthColor={mouthColor} />

      {/* Hair */}
      {renderHair(hairStyle, hairColor)}

      {/* Hat (on top of hair) */}
      {renderHat(hatStyle, hatColor)}

      {/* Accessories (front-facing, not cape/wings) */}
      {accessoryStyle !== 'cape' && accessoryStyle !== 'wings' && accessoryStyle !== 'none' && renderAccessory(accessoryStyle, accessoryColor)}

      {/* Pet */}
      {renderPet(petStyle, petColor, petPosition)}
    </svg>
  );
}

export default function AvatarDisplay({ config, size = 'md', name = '', animate = false }) {
  const px = SIZES[size] || SIZES.md;

  if (config && typeof config === 'object' && Object.keys(config).length > 0) {
    return (
      <div
        className={`rounded-full overflow-hidden flex-shrink-0${animate ? ' avatar-idle' : ''}`}
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
