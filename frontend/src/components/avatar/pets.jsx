/* ── Pets ──
   Now supports position: 'right' (default), 'left', 'head'.
   Enhanced with whiskers, tails, and more detail. */

const PET_OFFSETS = {
  right: 'translate(23,17)',
  left:  'translate(-1,17) scale(-1,1) translate(-6,0)',
  head:  'translate(11,0) scale(0.7)',
};

// Dragon/phoenix are slightly bigger — different offsets
const BIG_PET_OFFSETS = {
  right: 'translate(21,15)',
  left:  'translate(1,15) scale(-1,1) translate(-8,0)',
  head:  'translate(10,-1) scale(0.65)',
};

function PetCat({ color, position }) {
  return (
    <g transform={PET_OFFSETS[position] || PET_OFFSETS.right}>
      {/* Tail */}
      <path className="avatar-pet-tail" d="M5,4 Q7,2 6.5,5" stroke={color} strokeWidth="0.7" fill="none" strokeLinecap="round" />
      <ellipse cx="3" cy="3" rx="2.5" ry="2" fill={color} />
      {/* Ears */}
      <polygon points="1,1 1.5,-1 3,1" fill={color} />
      <polygon points="4,1 4.5,-1 5,1" fill={color} />
      {/* Eyes */}
      <circle cx="2" cy="3" r="0.5" fill="#333" />
      <circle cx="4" cy="3" r="0.5" fill="#333" />
      <circle cx="2.15" cy="2.85" r="0.15" fill="white" />
      <circle cx="4.15" cy="2.85" r="0.15" fill="white" />
      {/* Whiskers */}
      <line x1="0" y1="3.5" x2="1.5" y2="3.2" stroke={color} strokeWidth="0.2" opacity="0.5" />
      <line x1="0" y1="4.2" x2="1.5" y2="3.8" stroke={color} strokeWidth="0.2" opacity="0.5" />
      <line x1="4.5" y1="3.2" x2="6" y2="3.5" stroke={color} strokeWidth="0.2" opacity="0.5" />
      <line x1="4.5" y1="3.8" x2="6" y2="4.2" stroke={color} strokeWidth="0.2" opacity="0.5" />
    </g>
  );
}

function PetDog({ color, position }) {
  return (
    <g transform={PET_OFFSETS[position] || PET_OFFSETS.right}>
      {/* Tail */}
      <path className="avatar-pet-tail" d="M5.5,3 Q7,1 6.5,3.5" stroke={color} strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <ellipse cx="3" cy="3" rx="2.5" ry="2" fill={color} />
      {/* Floppy ears */}
      <ellipse cx="0.5" cy="1.5" rx="1.2" ry="1.8" fill={color} />
      <ellipse cx="5.5" cy="1.5" rx="1.2" ry="1.8" fill={color} />
      {/* Eyes */}
      <circle cx="2" cy="3" r="0.5" fill="#333" />
      <circle cx="4" cy="3" r="0.5" fill="#333" />
      <circle cx="2.15" cy="2.85" r="0.15" fill="white" />
      <circle cx="4.15" cy="2.85" r="0.15" fill="white" />
      {/* Nose */}
      <ellipse cx="3" cy="3.8" rx="0.5" ry="0.3" fill="#333" />
      {/* Tongue */}
      <path d="M3,4.1 Q3.3,5 3.5,4.1" fill="#e87a9a" />
    </g>
  );
}

function PetDragon({ color, position }) {
  return (
    <g transform={BIG_PET_OFFSETS[position] || BIG_PET_OFFSETS.right}>
      <ellipse cx="4" cy="4" rx="3" ry="2.5" fill={color} />
      {/* Spines */}
      <polygon points="2,2 1.5,0 3,2" fill={color} />
      <polygon points="4,1.5 4.5,0 5.5,1.5" fill={color} />
      <polygon points="6,2 7,0 7,2" fill={color} />
      {/* Eyes */}
      <circle cx="3" cy="3.5" r="0.5" fill="#f9d71c" />
      <circle cx="3" cy="3.5" r="0.2" fill="#111" />
      <circle cx="5" cy="3.5" r="0.5" fill="#f9d71c" />
      <circle cx="5" cy="3.5" r="0.2" fill="#111" />
      {/* Tail */}
      <path className="avatar-pet-tail" d="M6,4 Q8.5,3 8,5.5" stroke={color} strokeWidth="0.8" fill="none" strokeLinecap="round" />
      {/* Wings */}
      <polygon points="1,3 -1,2 0,4" fill={color} opacity="0.6" />
      <polygon points="7,3 9,2 8,4" fill={color} opacity="0.6" />
      {/* Fire breath */}
      <circle cx="2" cy="5" r="0.4" fill="#f39c12" opacity="0.6" />
    </g>
  );
}

function PetOwl({ color, position }) {
  return (
    <g transform={PET_OFFSETS[position] || PET_OFFSETS.right}>
      <ellipse cx="3" cy="3.5" rx="2.5" ry="3" fill={color} />
      {/* Tufts */}
      <polygon points="1.5,1 1,-0.5 2.5,1" fill={color} />
      <polygon points="3.5,1 5,-0.5 4.5,1" fill={color} />
      {/* Eyes */}
      <circle cx="2" cy="3" r="1" fill="white" />
      <circle cx="4" cy="3" r="1" fill="white" />
      <circle cx="2" cy="3" r="0.5" fill="#333" />
      <circle cx="4" cy="3" r="0.5" fill="#333" />
      <circle cx="2.15" cy="2.85" r="0.15" fill="white" />
      <circle cx="4.15" cy="2.85" r="0.15" fill="white" />
      {/* Beak */}
      <polygon points="2.5,4 3,4.8 3.5,4" fill="#f39c12" />
      {/* Wing detail */}
      <path d="M0.8,4 Q0,5.5 1,6" stroke={color} strokeWidth="0.5" fill="none" opacity="0.5" />
      <path d="M5.2,4 Q6,5.5 5,6" stroke={color} strokeWidth="0.5" fill="none" opacity="0.5" />
    </g>
  );
}

function PetBunny({ color, position }) {
  return (
    <g transform={PET_OFFSETS[position] || PET_OFFSETS.right}>
      <ellipse cx="3" cy="3" rx="2.5" ry="2" fill={color} />
      {/* Ears */}
      <ellipse cx="2" cy="0" rx="0.8" ry="2.5" fill={color} />
      <ellipse cx="2" cy="0" rx="0.4" ry="2" fill="#ffb6c1" opacity="0.4" />
      <ellipse cx="4" cy="0" rx="0.8" ry="2.5" fill={color} />
      <ellipse cx="4" cy="0" rx="0.4" ry="2" fill="#ffb6c1" opacity="0.4" />
      {/* Eyes */}
      <circle cx="2" cy="2.8" r="0.4" fill="#333" />
      <circle cx="4" cy="2.8" r="0.4" fill="#333" />
      <circle cx="2.1" cy="2.7" r="0.12" fill="white" />
      <circle cx="4.1" cy="2.7" r="0.12" fill="white" />
      {/* Nose */}
      <ellipse cx="3" cy="3.3" rx="0.3" ry="0.2" fill="#e87a9a" />
      {/* Tail puff */}
      <circle className="avatar-pet-tail" cx="5.5" cy="3.5" r="0.8" fill={color} />
    </g>
  );
}

function PetPhoenix({ color, position }) {
  return (
    <g transform={BIG_PET_OFFSETS[position] || BIG_PET_OFFSETS.right}>
      <ellipse cx="4" cy="4" rx="2.5" ry="2" fill={color} />
      {/* Crest */}
      <polygon points="2,3 0,1 3,3" fill="#f39c12" />
      <polygon points="4,2 4.5,0 5.5,2" fill="#f39c12" />
      <polygon points="5,2 6.5,0 7,3" fill="#f39c12" />
      {/* Eyes */}
      <circle cx="3" cy="3.5" r="0.5" fill="#333" />
      <circle cx="5" cy="3.5" r="0.5" fill="#333" />
      <circle cx="3.15" cy="3.35" r="0.15" fill="white" />
      <circle cx="5.15" cy="3.35" r="0.15" fill="white" />
      {/* Beak */}
      <polygon points="3.5,4.5 4,5.5 4.5,4.5" fill="#f39c12" />
      {/* Tail flames */}
      <g className="avatar-pet-tail">
        <path d="M1,5 Q-0.5,7 1.5,6" stroke="#ff4444" strokeWidth="0.6" fill="#f39c12" opacity="0.7" />
        <path d="M7,5 Q8.5,7 6.5,6" stroke="#ff4444" strokeWidth="0.6" fill="#f39c12" opacity="0.7" />
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

export function renderPet(style, color, position = 'right') {
  if (style === 'none' || !style) return null;
  const Component = PET_MAP[style];
  if (!Component) return null;
  return <Component color={color} position={position} />;
}
