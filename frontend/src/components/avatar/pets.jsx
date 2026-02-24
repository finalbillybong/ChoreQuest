/* ── Pets ──
   Supports multi-part colouring (body, ears, tail, accent),
   per-level visual extras, and custom x/y positioning.
   Position: 'right' (default), 'left', 'head', 'custom'. */

const PET_OFFSETS = {
  right: 'translate(23,17)',
  left:  'translate(-1,17) scale(-1,1) translate(-6,0)',
  head:  'translate(11,0) scale(0.7)',
};

const BIG_PET_OFFSETS = {
  right: 'translate(21,15)',
  left:  'translate(1,15) scale(-1,1) translate(-8,0)',
  head:  'translate(10,-1) scale(0.65)',
};

/** Build a colors object from config, falling back to the single pet_color. */
export function buildPetColors(config) {
  const base = config.pet_color || '#8b4513';
  return {
    body:   config.pet_color_body   || base,
    ears:   config.pet_color_ears   || base,
    tail:   config.pet_color_tail   || base,
    accent: config.pet_color_accent || base,
  };
}

// ── Individual pet components ──

function PetCat({ colors, position }) {
  const t = PET_OFFSETS[position] || PET_OFFSETS.right;
  return (
    <g transform={t}>
      {/* Tail */}
      <path className="avatar-pet-tail" d="M5,4 Q7,2 6.5,5" stroke={colors.tail} strokeWidth="0.7" fill="none" strokeLinecap="round" />
      <ellipse cx="3" cy="3" rx="2.5" ry="2" fill={colors.body} />
      {/* Ears */}
      <polygon points="1,1 1.5,-1 3,1" fill={colors.ears} />
      <polygon points="4,1 4.5,-1 5,1" fill={colors.ears} />
      {/* Eyes */}
      <circle cx="2" cy="3" r="0.5" fill="#333" />
      <circle cx="4" cy="3" r="0.5" fill="#333" />
      <circle cx="2.15" cy="2.85" r="0.15" fill="white" />
      <circle cx="4.15" cy="2.85" r="0.15" fill="white" />
      {/* Whiskers */}
      <line x1="0" y1="3.5" x2="1.5" y2="3.2" stroke={colors.accent} strokeWidth="0.2" opacity="0.5" />
      <line x1="0" y1="4.2" x2="1.5" y2="3.8" stroke={colors.accent} strokeWidth="0.2" opacity="0.5" />
      <line x1="4.5" y1="3.2" x2="6" y2="3.5" stroke={colors.accent} strokeWidth="0.2" opacity="0.5" />
      <line x1="4.5" y1="3.8" x2="6" y2="4.2" stroke={colors.accent} strokeWidth="0.2" opacity="0.5" />
    </g>
  );
}

function PetDog({ colors, position }) {
  const t = PET_OFFSETS[position] || PET_OFFSETS.right;
  return (
    <g transform={t}>
      {/* Tail */}
      <path className="avatar-pet-tail" d="M5.5,3 Q7,1 6.5,3.5" stroke={colors.tail} strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <ellipse cx="3" cy="3" rx="2.5" ry="2" fill={colors.body} />
      {/* Floppy ears */}
      <ellipse cx="0.5" cy="1.5" rx="1.2" ry="1.8" fill={colors.ears} />
      <ellipse cx="5.5" cy="1.5" rx="1.2" ry="1.8" fill={colors.ears} />
      {/* Eyes */}
      <circle cx="2" cy="3" r="0.5" fill="#333" />
      <circle cx="4" cy="3" r="0.5" fill="#333" />
      <circle cx="2.15" cy="2.85" r="0.15" fill="white" />
      <circle cx="4.15" cy="2.85" r="0.15" fill="white" />
      {/* Nose */}
      <ellipse cx="3" cy="3.8" rx="0.5" ry="0.3" fill={colors.accent} />
      {/* Tongue */}
      <path d="M3,4.1 Q3.3,5 3.5,4.1" fill="#e87a9a" />
    </g>
  );
}

function PetDragon({ colors, position }) {
  const t = BIG_PET_OFFSETS[position] || BIG_PET_OFFSETS.right;
  return (
    <g transform={t}>
      <ellipse cx="4" cy="4" rx="3" ry="2.5" fill={colors.body} />
      {/* Spines */}
      <polygon points="2,2 1.5,0 3,2" fill={colors.ears} />
      <polygon points="4,1.5 4.5,0 5.5,1.5" fill={colors.ears} />
      <polygon points="6,2 7,0 7,2" fill={colors.ears} />
      {/* Eyes */}
      <circle cx="3" cy="3.5" r="0.5" fill="#f9d71c" />
      <circle cx="3" cy="3.5" r="0.2" fill="#111" />
      <circle cx="5" cy="3.5" r="0.5" fill="#f9d71c" />
      <circle cx="5" cy="3.5" r="0.2" fill="#111" />
      {/* Tail */}
      <path className="avatar-pet-tail" d="M6,4 Q8.5,3 8,5.5" stroke={colors.tail} strokeWidth="0.8" fill="none" strokeLinecap="round" />
      {/* Wings */}
      <polygon points="1,3 -1,2 0,4" fill={colors.accent} opacity="0.6" />
      <polygon points="7,3 9,2 8,4" fill={colors.accent} opacity="0.6" />
      {/* Fire breath */}
      <circle cx="2" cy="5" r="0.4" fill={colors.accent} opacity="0.6" />
    </g>
  );
}

function PetOwl({ colors, position }) {
  const t = PET_OFFSETS[position] || PET_OFFSETS.right;
  return (
    <g transform={t}>
      <ellipse cx="3" cy="3.5" rx="2.5" ry="3" fill={colors.body} />
      {/* Tufts */}
      <polygon points="1.5,1 1,-0.5 2.5,1" fill={colors.ears} />
      <polygon points="3.5,1 5,-0.5 4.5,1" fill={colors.ears} />
      {/* Eyes */}
      <circle cx="2" cy="3" r="1" fill="white" />
      <circle cx="4" cy="3" r="1" fill="white" />
      <circle cx="2" cy="3" r="0.5" fill="#333" />
      <circle cx="4" cy="3" r="0.5" fill="#333" />
      <circle cx="2.15" cy="2.85" r="0.15" fill="white" />
      <circle cx="4.15" cy="2.85" r="0.15" fill="white" />
      {/* Beak */}
      <polygon points="2.5,4 3,4.8 3.5,4" fill={colors.accent} />
      {/* Wing detail */}
      <path d="M0.8,4 Q0,5.5 1,6" stroke={colors.tail} strokeWidth="0.5" fill="none" opacity="0.5" />
      <path d="M5.2,4 Q6,5.5 5,6" stroke={colors.tail} strokeWidth="0.5" fill="none" opacity="0.5" />
    </g>
  );
}

function PetBunny({ colors, position }) {
  const t = PET_OFFSETS[position] || PET_OFFSETS.right;
  return (
    <g transform={t}>
      <ellipse cx="3" cy="3" rx="2.5" ry="2" fill={colors.body} />
      {/* Ears */}
      <ellipse cx="2" cy="0" rx="0.8" ry="2.5" fill={colors.ears} />
      <ellipse cx="2" cy="0" rx="0.4" ry="2" fill={colors.accent} opacity="0.4" />
      <ellipse cx="4" cy="0" rx="0.8" ry="2.5" fill={colors.ears} />
      <ellipse cx="4" cy="0" rx="0.4" ry="2" fill={colors.accent} opacity="0.4" />
      {/* Eyes */}
      <circle cx="2" cy="2.8" r="0.4" fill="#333" />
      <circle cx="4" cy="2.8" r="0.4" fill="#333" />
      <circle cx="2.1" cy="2.7" r="0.12" fill="white" />
      <circle cx="4.1" cy="2.7" r="0.12" fill="white" />
      {/* Nose */}
      <ellipse cx="3" cy="3.3" rx="0.3" ry="0.2" fill={colors.accent} />
      {/* Tail puff */}
      <circle className="avatar-pet-tail" cx="5.5" cy="3.5" r="0.8" fill={colors.tail} />
    </g>
  );
}

function PetPhoenix({ colors, position }) {
  const t = BIG_PET_OFFSETS[position] || BIG_PET_OFFSETS.right;
  return (
    <g transform={t}>
      <ellipse cx="4" cy="4" rx="2.5" ry="2" fill={colors.body} />
      {/* Crest */}
      <polygon points="2,3 0,1 3,3" fill={colors.accent} />
      <polygon points="4,2 4.5,0 5.5,2" fill={colors.accent} />
      <polygon points="5,2 6.5,0 7,3" fill={colors.accent} />
      {/* Eyes */}
      <circle cx="3" cy="3.5" r="0.5" fill="#333" />
      <circle cx="5" cy="3.5" r="0.5" fill="#333" />
      <circle cx="3.15" cy="3.35" r="0.15" fill="white" />
      <circle cx="5.15" cy="3.35" r="0.15" fill="white" />
      {/* Beak */}
      <polygon points="3.5,4.5 4,5.5 4.5,4.5" fill={colors.ears} />
      {/* Tail flames */}
      <g className="avatar-pet-tail">
        <path d="M1,5 Q-0.5,7 1.5,6" stroke={colors.tail} strokeWidth="0.6" fill={colors.accent} opacity="0.7" />
        <path d="M7,5 Q8.5,7 6.5,6" stroke={colors.tail} strokeWidth="0.6" fill={colors.accent} opacity="0.7" />
      </g>
    </g>
  );
}

const PET_MAP = {
  cat: PetCat,
  dog: PetDog,
  dragon: PetDragon,
  owl: PetOwl,
  bunny: PetBunny,
  phoenix: PetPhoenix,
};

const BIG_PETS = new Set(['dragon', 'phoenix']);

// ── Per-level visual extras ──

/**
 * Render additional SVG elements based on pet level.
 * These are drawn on top of the base pet inside the same coordinate space.
 * @param {string} petStyle - pet type id
 * @param {number} level - 1-8
 * @param {object} colors - multi-part color object
 * @param {string} position - position id
 */
export function renderPetExtras(petStyle, level, colors, position, config = {}) {
  if (!petStyle || petStyle === 'none' || level < 2) return null;
  const isBig = BIG_PETS.has(petStyle);
  const offsets = isBig
    ? (BIG_PET_OFFSETS[position] || BIG_PET_OFFSETS.right)
    : (PET_OFFSETS[position] || PET_OFFSETS.right);
  // Center of pet in local coords
  const cx = isBig ? 4 : 3;
  const cy = isBig ? 3 : 2.5;

  const extras = [];

  // Lv2: subtle outline glow
  if (level >= 2) {
    extras.push(
      <ellipse key="glow2" cx={cx} cy={cy + 0.5} rx={isBig ? 3.5 : 3} ry={isBig ? 3 : 2.5}
        fill="none" stroke={colors.body} strokeWidth="0.3" opacity="0.25" />
    );
  }

  // Lv3: small accessory detail — collar dot / gem
  if (level >= 3) {
    extras.push(
      <circle key="gem3" cx={cx} cy={cy + (isBig ? 2.5 : 1.8)} r="0.35"
        fill={colors.accent} stroke="white" strokeWidth="0.15" opacity="0.8" />
    );
  }

  // Lv4: eye shine highlights
  if (level >= 4) {
    const eyeL = isBig ? 3 : 2;
    const eyeR = isBig ? 5 : 4;
    const eyeY = isBig ? 3.2 : 2.7;
    extras.push(
      <circle key="shine4l" cx={eyeL + 0.2} cy={eyeY - 0.2} r="0.2" fill={colors.accent} opacity="0.5" />,
      <circle key="shine4r" cx={eyeR + 0.2} cy={eyeY - 0.2} r="0.2" fill={colors.accent} opacity="0.5" />
    );
  }

  // Lv5: sparkle particles
  if (level >= 5) {
    extras.push(
      <circle key="spark5a" className="pet-sparkle" cx={cx - 2} cy={cy - 2} r="0.3" fill="white" />,
      <circle key="spark5b" className="pet-sparkle pet-sparkle-delay" cx={cx + 2.5} cy={cy - 1} r="0.25" fill="white" />
    );
  }

  // Lv6: colored outline stroke
  if (level >= 6) {
    extras.push(
      <ellipse key="stroke6" cx={cx} cy={cy + 0.5} rx={isBig ? 3.8 : 3.2} ry={isBig ? 3.2 : 2.7}
        fill="none" stroke={colors.accent} strokeWidth="0.25" opacity="0.4"
        className="pet-shimmer" />
    );
  }

  // Lv7: crown / halo
  if (level >= 7) {
    extras.push(
      <g key="crown7" opacity="0.85">
        <polygon
          points={`${cx - 1.2},${cy - (isBig ? 3.2 : 2.5)} ${cx - 0.6},${cy - (isBig ? 4 : 3.3)} ${cx},${cy - (isBig ? 3.5 : 2.8)} ${cx + 0.6},${cy - (isBig ? 4 : 3.3)} ${cx + 1.2},${cy - (isBig ? 3.2 : 2.5)}`}
          fill="#f59e0b"
        />
        <circle cx={cx} cy={cy - (isBig ? 4 : 3.2)} r="0.2" fill="white" opacity="0.7" />
      </g>
    );
  }

  // Lv8: extra sparkles + shimmer intensifies
  if (level >= 8) {
    extras.push(
      <circle key="spark8a" className="pet-sparkle" cx={cx + 1.5} cy={cy - 2.5} r="0.3" fill="#f59e0b" />,
      <circle key="spark8b" className="pet-sparkle pet-sparkle-delay" cx={cx - 1.8} cy={cy + 0.5} r="0.25" fill="#f59e0b" />,
      <circle key="spark8c" className="pet-sparkle" cx={cx + 0.5} cy={cy + 2} r="0.2" fill="#fbbf24" />
    );
  }

  if (extras.length === 0) return null;

  // Custom position: mirror the same transform logic as renderPet
  if (position === 'custom' && config.pet_x != null && config.pet_y != null) {
    const ccx = isBig ? 25 : 26;
    const ccy = isBig ? 19 : 20;
    const flip = config.pet_x < 16;
    const t = flip
      ? `translate(${config.pet_x},${config.pet_y}) scale(-1,1) translate(${-ccx},${-ccy})`
      : `translate(${config.pet_x - ccx},${config.pet_y - ccy})`;
    return <g transform={t}>{extras}</g>;
  }

  return <g transform={offsets}>{extras}</g>;
}

// ── Main render function ──

export function renderPet(style, color, position = 'right', config = {}) {
  if (style === 'none' || !style) return null;
  const Component = PET_MAP[style];
  if (!Component) return null;

  // Build multi-part colors, supporting both old single-color and new multi-part
  const colors = typeof color === 'object' ? color : buildPetColors({ pet_color: color, ...config });

  // Custom position — counter the Component's internal PET_OFFSETS so
  // the pet center lands exactly at the tap point (pet_x, pet_y).
  if (position === 'custom' && config.pet_x != null && config.pet_y != null) {
    const isBig = BIG_PETS.has(style);
    const flip = config.pet_x < 16;
    // Pet center in parent coords after Component's internal offset
    const cx = isBig ? 25 : 26;
    const cy = isBig ? 19 : 20;
    const t = flip
      ? `translate(${config.pet_x},${config.pet_y}) scale(-1,1) translate(${-cx},${-cy})`
      : `translate(${config.pet_x - cx},${config.pet_y - cy})`;
    return (
      <g transform={t}>
        <Component colors={colors} position="right" />
      </g>
    );
  }

  return <Component colors={colors} position={position} />;
}

/**
 * Render a pet accessory (hat/decoration) on top of the pet.
 * Drawn in the same coordinate space as the pet.
 */
export function renderPetAccessory(petStyle, accessory, position = 'right', config = {}) {
  if (!accessory || accessory === 'none' || !petStyle || petStyle === 'none') return null;
  const isBig = BIG_PETS.has(petStyle);
  const offsets = isBig
    ? (BIG_PET_OFFSETS[position] || BIG_PET_OFFSETS.right)
    : (PET_OFFSETS[position] || PET_OFFSETS.right);
  const cx = isBig ? 4 : 3;
  const cy = isBig ? 2 : 1.5;

  let accessoryEl = null;
  switch (accessory) {
    case 'crown':
      accessoryEl = (
        <g>
          <polygon points={`${cx-1.5},${cy-1} ${cx-0.8},${cy-2.2} ${cx},${cy-1.5} ${cx+0.8},${cy-2.2} ${cx+1.5},${cy-1}`} fill="#f59e0b" stroke="#d97706" strokeWidth="0.15" />
          <circle cx={cx} cy={cy-2} r="0.25" fill="white" opacity="0.8" />
        </g>
      );
      break;
    case 'party_hat':
      accessoryEl = (
        <g>
          <polygon points={`${cx-1.2},${cy-0.5} ${cx},${cy-2.5} ${cx+1.2},${cy-0.5}`} fill="#ec4899" stroke="#be185d" strokeWidth="0.15" />
          <circle cx={cx} cy={cy-2.5} r="0.3" fill="#fbbf24" />
          <line x1={cx-0.5} y1={cy-1.5} x2={cx+0.5} y2={cy-1.5} stroke="white" strokeWidth="0.2" opacity="0.5" />
        </g>
      );
      break;
    case 'bow':
      accessoryEl = (
        <g>
          <ellipse cx={cx-0.6} cy={cy-1} rx="0.6" ry="0.4" fill="#ec4899" />
          <ellipse cx={cx+0.6} cy={cy-1} rx="0.6" ry="0.4" fill="#ec4899" />
          <circle cx={cx} cy={cy-1} r="0.2" fill="#be185d" />
        </g>
      );
      break;
    case 'bandana':
      accessoryEl = (
        <g>
          <path d={`M${cx-1.5},${cy-0.3} Q${cx},${cy-0.8} ${cx+1.5},${cy-0.3}`} fill="#ef4444" stroke="#b91c1c" strokeWidth="0.15" />
          <path d={`M${cx+1},${cy-0.3} L${cx+1.8},${cy+0.5} L${cx+1.5},${cy+0.6}`} fill="#ef4444" />
        </g>
      );
      break;
    case 'halo':
      accessoryEl = (
        <ellipse cx={cx} cy={cy-1.5} rx="1.5" ry="0.4" fill="none" stroke="#fbbf24" strokeWidth="0.3" opacity="0.7" />
      );
      break;
    case 'flower':
      accessoryEl = (
        <g>
          {[0, 72, 144, 216, 288].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const px = cx - 1 + Math.cos(rad) * 0.5;
            const py = cy - 1 + Math.sin(rad) * 0.5;
            return <circle key={i} cx={px} cy={py} r="0.3" fill="#f472b6" />;
          })}
          <circle cx={cx-1} cy={cy-1} r="0.2" fill="#fbbf24" />
        </g>
      );
      break;
    default:
      return null;
  }

  if (position === 'custom' && config.pet_x != null && config.pet_y != null) {
    const ccx = isBig ? 25 : 26;
    const ccy = isBig ? 19 : 20;
    const flip = config.pet_x < 16;
    const t = flip
      ? `translate(${config.pet_x},${config.pet_y}) scale(-1,1) translate(${-ccx},${-ccy})`
      : `translate(${config.pet_x - ccx},${config.pet_y - ccy})`;
    return <g transform={t}>{accessoryEl}</g>;
  }

  return <g transform={offsets}>{accessoryEl}</g>;
}
