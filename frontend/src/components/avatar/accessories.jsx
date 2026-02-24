/* ── Accessories ──
   Enhanced with subtle detail/shading. */

export function renderAccessory(style, color) {
  switch (style) {
    case 'scarf':
      return (
        <g>
          <rect x="9" y="20" width="14" height="3" rx="1" fill={color} />
          <rect x="9" y="20" width="3" height="6" rx="1" fill={color} />
          <line x1="10" y1="22" x2="11" y2="22" stroke="white" strokeWidth="0.3" opacity="0.15" />
        </g>
      );
    case 'necklace':
      return (
        <g>
          <path d="M12,22 Q16,25 20,22" stroke={color} strokeWidth="0.6" fill="none" />
          <circle cx="16" cy="24" r="1" fill={color} />
          <circle cx="15.7" cy="23.7" r="0.3" fill="white" opacity="0.3" />
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
          <path d="M10,23 Q12,25 11,28" stroke="white" strokeWidth="0.3" fill="none" opacity="0.1" />
        </g>
      );
    case 'wings':
      return (
        <g opacity="0.6">
          <path d="M9,24 Q4,20 5,26 Q6,29 9,28" fill={color} />
          <path d="M23,24 Q28,20 27,26 Q26,29 23,28" fill={color} />
          <path d="M8,24 Q5,21 6,25" stroke="white" strokeWidth="0.3" fill="none" opacity="0.15" />
          <path d="M24,24 Q27,21 26,25" stroke="white" strokeWidth="0.3" fill="none" opacity="0.15" />
        </g>
      );
    case 'shield':
      return (
        <g>
          {/* Heater shield held on left arm */}
          <path d="M8,21 L14,21 L14,26 Q11,31 8,26 Z" fill={color} />
          <line x1="11" y1="22" x2="11" y2="28" stroke="white" strokeWidth="0.5" opacity="0.35" />
          <circle cx="11" cy="24.5" r="1.2" fill="white" opacity="0.15" />
        </g>
      );
    case 'sword':
      return (
        <g transform="rotate(30, 20, 25)">
          {/* Blade — upper part visible, lower hidden behind body */}
          <rect x="19.4" y="17" width="1.2" height="14" rx="0.3" fill="#c0c0c0" />
          <line x1="19.7" y1="18" x2="19.7" y2="30" stroke="white" strokeWidth="0.2" opacity="0.3" />
          {/* Crossguard */}
          <rect x="17.5" y="16" width="5" height="1.5" rx="0.5" fill={color} />
          {/* Grip */}
          <rect x="19.4" y="11.5" width="1.2" height="5" rx="0.3" fill={color} />
          {/* Pommel */}
          <circle cx="20" cy="11.5" r="1" fill={color} />
        </g>
      );
    case 'none':
    default:
      return null;
  }
}
