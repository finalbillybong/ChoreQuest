/* ── Hats ──
   Enhanced with subtle shading/highlights for depth. */

export function renderHat(style, color) {
  switch (style) {
    case 'crown':
      return (
        <g>
          <polygon points="10,8 11,4 13,7 16,3 19,7 21,4 22,8" fill={color} />
          <rect x="10" y="7" width="12" height="2" rx="0.5" fill={color} />
          {/* Gem highlights */}
          <circle cx="13" cy="6" r="0.5" fill="white" opacity="0.4" />
          <circle cx="16" cy="4" r="0.5" fill="white" opacity="0.4" />
          <circle cx="19" cy="6" r="0.5" fill="white" opacity="0.4" />
        </g>
      );
    case 'wizard':
      return (
        <g>
          <polygon points="16,0 10,9 22,9" fill={color} />
          <ellipse cx="16" cy="9" rx="7" ry="1.5" fill={color} />
          <text x="16" y="7" textAnchor="middle" fill="#f9d71c" fontSize="3" fontFamily="sans-serif">&#9733;</text>
          <line x1="12" y1="7" x2="14" y2="3" stroke="white" strokeWidth="0.3" opacity="0.15" />
        </g>
      );
    case 'beanie':
      return (
        <g>
          <ellipse cx="16" cy="8" rx="7.5" ry="4" fill={color} />
          <rect x="8.5" y="7" width="15" height="2.5" rx="1" fill={color} opacity="0.7" />
          <circle cx="16" cy="4" r="1.2" fill={color} />
          <path d="M10,9 Q13,8 16,9" stroke="white" strokeWidth="0.3" opacity="0.1" fill="none" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <ellipse cx="16" cy="8" rx="7.5" ry="3.5" fill={color} />
          <ellipse cx="10" cy="9" rx="5" ry="1.2" fill={color} />
          <line x1="6" y1="9" x2="10" y2="8.5" stroke="white" strokeWidth="0.3" opacity="0.15" />
        </g>
      );
    case 'pirate':
      return (
        <g>
          <ellipse cx="16" cy="7.5" rx="8" ry="3" fill="#1a1a2e" />
          <rect x="8" y="7" width="16" height="1.5" fill={color} />
          <text x="16" y="7" textAnchor="middle" fill="white" fontSize="3" fontFamily="sans-serif">&#9760;</text>
        </g>
      );
    case 'headphones':
      return (
        <g>
          <path d="M9,12 Q9,5 16,5 Q23,5 23,12" stroke={color} strokeWidth="1.5" fill="none" />
          <rect x="7" y="11" width="3" height="4" rx="1" fill={color} />
          <rect x="22" y="11" width="3" height="4" rx="1" fill={color} />
          <rect x="7.5" y="12" width="2" height="2" rx="0.5" fill="white" opacity="0.15" />
          <rect x="22.5" y="12" width="2" height="2" rx="0.5" fill="white" opacity="0.15" />
        </g>
      );
    case 'tiara':
      return (
        <g>
          <path d="M10,8 L12,5 L14,7 L16,4 L18,7 L20,5 L22,8" stroke={color} strokeWidth="0.8" fill="none" />
          <circle cx="16" cy="4" r="0.8" fill={color} />
          <circle cx="12" cy="5" r="0.4" fill={color} />
          <circle cx="20" cy="5" r="0.4" fill={color} />
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
