const SIZES = {
  sm: 32,
  md: 64,
  lg: 128,
};

const AVATAR_COLORS = [
  '#f9d71c', // gold
  '#2de2a6', // emerald
  '#b388ff', // purple
  '#64dfdf', // sky
  '#ff4444', // crimson
  '#ff8c42', // orange
  '#ff6b9d', // pink
  '#45b7d1', // teal
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

// Simple SVG-based pixel character using avatar config parts
function SvgAvatar({ config, size }) {
  const s = size;
  const skinColor = config.skin_color || '#ffcc99';
  const hairColor = config.hair_color || '#4a3728';
  const shirtColor = config.shirt_color || '#64dfdf';
  const eyeColor = config.eye_color || '#333333';
  const hairStyle = config.hair_style || 'short';

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 32 32"
      className="rounded-full"
      style={{ background: '#1a1a2e' }}
    >
      {/* Body / Shirt */}
      <rect x="9" y="22" width="14" height="10" rx="2" fill={shirtColor} />

      {/* Neck */}
      <rect x="14" y="20" width="4" height="4" fill={skinColor} />

      {/* Head */}
      <ellipse cx="16" cy="14" rx="7" ry="8" fill={skinColor} />

      {/* Eyes */}
      <rect x="12" y="13" width="2.5" height="2.5" rx="1" fill={eyeColor} />
      <rect x="17.5" y="13" width="2.5" height="2.5" rx="1" fill={eyeColor} />

      {/* Mouth */}
      <rect x="13.5" y="17" width="5" height="1" rx="0.5" fill={eyeColor} opacity="0.5" />

      {/* Hair */}
      {hairStyle === 'short' && (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={hairColor} />
          <rect x="8.5" y="8" width="3" height="5" rx="1" fill={hairColor} />
          <rect x="20.5" y="8" width="3" height="5" rx="1" fill={hairColor} />
        </>
      )}
      {hairStyle === 'long' && (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={hairColor} />
          <rect x="8" y="8" width="3.5" height="14" rx="1.5" fill={hairColor} />
          <rect x="20.5" y="8" width="3.5" height="14" rx="1.5" fill={hairColor} />
        </>
      )}
      {hairStyle === 'spiky' && (
        <>
          <polygon points="10,10 13,3 15,9" fill={hairColor} />
          <polygon points="14,9 16,2 18,9" fill={hairColor} />
          <polygon points="17,10 20,3 22,10" fill={hairColor} />
          <ellipse cx="16" cy="9" rx="7" ry="3.5" fill={hairColor} />
        </>
      )}
      {hairStyle === 'curly' && (
        <>
          <circle cx="10" cy="9" r="3" fill={hairColor} />
          <circle cx="16" cy="7" r="3.5" fill={hairColor} />
          <circle cx="22" cy="9" r="3" fill={hairColor} />
          <circle cx="8.5" cy="13" r="2.5" fill={hairColor} />
          <circle cx="23.5" cy="13" r="2.5" fill={hairColor} />
        </>
      )}
      {hairStyle === 'mohawk' && (
        <>
          <rect x="13" y="2" width="6" height="8" rx="2" fill={hairColor} />
        </>
      )}
      {/* Default fallback for unknown hair styles */}
      {!['short', 'long', 'spiky', 'curly', 'mohawk'].includes(hairStyle) && (
        <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={hairColor} />
      )}
    </svg>
  );
}

export default function AvatarDisplay({ config, size = 'md', name = '' }) {
  const px = SIZES[size] || SIZES.md;

  // If config exists and has any meaningful data, render SVG avatar
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
      style={{
        width: px,
        height: px,
        backgroundColor: bgColor,
      }}
    >
      <span
        className="font-heading text-navy leading-none"
        style={{ fontSize }}
      >
        {initials}
      </span>
    </div>
  );
}
