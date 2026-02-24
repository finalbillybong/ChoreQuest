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
  xl: 176,
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

/* ── Eyelid config per eye style ──
   'both' = two eyelids, 'left' = left eye only, null = no blink */
const EYELID_MODE = {
  normal: 'both', wide: 'both', angry: 'both', dot: 'both',
  glasses: 'both', crying: 'both', heart_eyes: 'both',
  wink: 'left',       // right eye already winking
  eye_patch: 'left',  // right eye covered by patch
  // These don't blink:
  happy: null, sleepy: null, closed: null,
  sunglasses: null, star: null, dizzy: null,
};

/* ── Layout offsets per head shape ──
   Shifts hair, hats, and facial features so they align with each head. */
const HEAD_OFFSETS = {
  round:    { hair: 0,    hat: 0,    face: 0 },
  oval:     { hair: -1,   hat: -1,   face: 0 },
  long:     { hair: -3,   hat: -3,   face: -1 },
  square:   { hair: 0,    hat: 0,    face: 0 },
  diamond:  { hair: -1,   hat: -1,   face: 0 },
  heart:    { hair: 0,    hat: 0,    face: 0 },
  triangle: { hair: -1,   hat: -1,   face: 1.5 },
  pear:     { hair: -0.5, hat: -0.5, face: 0.5 },
  wide:     { hair: 1,    hat: 1,    face: 0 },
};

/* ── Horizontal scale for behind-body accessories per body shape ──
   Keeps capes/wings proportional to the body width. */
const BEHIND_ACCESSORY_SCALE = {
  regular: { cape: 1, wings: 1 },
  slim:    { cape: 1, wings: 0.82 },
  broad:   { cape: 1.3, wings: 1.2 },
};

/* Scale horizontally around center x=16 */
function scaleAroundCenter(s) {
  if (s === 1) return undefined;
  return `translate(16, 0) scale(${s}, 1) translate(-16, 0)`;
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

  const off = HEAD_OFFSETS[headShape] || HEAD_OFFSETS.round;
  const behindScale = BEHIND_ACCESSORY_SCALE[bodyShape] || BEHIND_ACCESSORY_SCALE.regular;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className="avatar-svg rounded-full"
      style={{ background: bgColor }}
    >
      {/* Accessory behind body (cape, wings) — scaled to match body width */}
      {(accessoryStyle === 'cape' || accessoryStyle === 'wings') && (
        <g transform={scaleAroundCenter(behindScale[accessoryStyle] || 1)}>
          {renderAccessory(accessoryStyle, accessoryColor)}
        </g>
      )}

      {/* Neck */}
      <rect x="14" y="20" width="4" height="4" fill={headColor} />

      {/* Body / Shirt */}
      {renderBody(bodyShape, bodyColor)}
      {renderOutfitPattern(outfitPatternStyle, bodyShape)}

      {/* Head */}
      <HeadComponent color={headColor} />

      {/* Face features — shifted to align with head shape */}
      <g transform={off.face ? `translate(0, ${off.face})` : undefined}>
        {/* Face extras (under eyes) */}
        {renderFaceExtra(faceExtraStyle)}

        {/* Eyes */}
        <EyesComponent color={eyeColor} />

        {/* Eyelids — head-colored ovals that briefly cover eyes to simulate blink */}
        {(EYELID_MODE[eyeStyle] === 'both' || EYELID_MODE[eyeStyle] === 'left') && (
          <ellipse className="avatar-eyelid" cx="12.75" cy="13.5" rx="2.8" ry="2.5" fill={headColor} />
        )}
        {EYELID_MODE[eyeStyle] === 'both' && (
          <ellipse className="avatar-eyelid" cx="19.25" cy="13.5" rx="2.8" ry="2.5" fill={headColor} />
        )}

        {/* Mouth — wrapped for breathing animation */}
        <g className="avatar-mouth">
          <MouthComponent color={mouthColor} mouthColor={mouthColor} />
        </g>
      </g>

      {/* Hair — shifted to align with head shape */}
      <g transform={off.hair ? `translate(0, ${off.hair})` : undefined}>
        {renderHair(hairStyle, hairColor)}
      </g>

      {/* Hat (on top of hair) — shifted to align with head shape */}
      <g transform={off.hat ? `translate(0, ${off.hat})` : undefined}>
        {renderHat(hatStyle, hatColor)}
      </g>

      {/* Accessories (front-facing, not cape/wings) — with sparkle overlay */}
      {accessoryStyle !== 'cape' && accessoryStyle !== 'wings' && accessoryStyle !== 'none' && (
        <g className="avatar-accessory">
          {renderAccessory(accessoryStyle, accessoryColor)}
          <circle className="avatar-sparkle" cx="16" cy="23" r="0.6" fill="white" opacity="0" />
        </g>
      )}

      {/* Pet — wrapped for wiggle animation */}
      <g className="avatar-pet">
        {renderPet(petStyle, petColor, petPosition)}
      </g>
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
