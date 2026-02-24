/* ── Hair styles ──
   Enhanced with subtle volume highlights for depth. */

export function renderHair(style, color) {
  // Slightly lighter shade for highlight layer
  switch (style) {
    case 'short':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <rect x="8.5" y="8" width="3" height="5" rx="1" fill={color} />
          <rect x="20.5" y="8" width="3" height="5" rx="1" fill={color} />
          <ellipse cx="14" cy="8" rx="3" ry="1.5" fill="white" opacity="0.06" />
        </>
      );
    case 'long':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <rect x="8" y="8" width="3.5" height="14" rx="1.5" fill={color} />
          <rect x="20.5" y="8" width="3.5" height="14" rx="1.5" fill={color} />
          <ellipse cx="14" cy="8" rx="3" ry="1.5" fill="white" opacity="0.06" />
        </>
      );
    case 'spiky':
      return (
        <>
          <polygon points="10,10 13,3 15,9" fill={color} />
          <polygon points="14,9 16,2 18,9" fill={color} />
          <polygon points="17,10 20,3 22,10" fill={color} />
          <polygon points="8,11 10,5 12,10" fill={color} />
          <polygon points="20,11 22,5 24,10" fill={color} />
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
          <circle cx="13" cy="6" r="2" fill={color} />
          <circle cx="19" cy="6" r="2" fill={color} />
        </>
      );
    case 'mohawk':
      return (
        <>
          <rect x="13" y="2" width="6" height="8" rx="2" fill={color} />
          <ellipse cx="16" cy="3" rx="2.5" ry="1.5" fill="white" opacity="0.06" />
        </>
      );
    case 'buzz':
      return <ellipse cx="16" cy="8.5" rx="7.5" ry="3" fill={color} opacity="0.7" />;
    case 'ponytail':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <rect x="20" y="7" width="3" height="3" rx="1" fill={color} />
          <rect x="22" y="9" width="2.5" height="10" rx="1" fill={color} />
          <circle cx="23.3" cy="19" r="1.5" fill={color} />
        </>
      );
    case 'bun':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <circle cx="16" cy="4" r="3.5" fill={color} />
          <circle cx="15" cy="3" r="1" fill="white" opacity="0.06" />
        </>
      );
    case 'pigtails':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <circle cx="7" cy="11" r="3" fill={color} />
          <circle cx="25" cy="11" r="3" fill={color} />
          <rect x="6" y="11" width="2.5" height="6" rx="1" fill={color} />
          <rect x="23.5" y="11" width="2.5" height="6" rx="1" fill={color} />
        </>
      );
    case 'afro':
      return (
        <>
          <ellipse cx="16" cy="10" rx="10" ry="8" fill={color} />
          <ellipse cx="13" cy="7" rx="4" ry="2.5" fill="white" opacity="0.05" />
        </>
      );
    case 'braids':
      return (
        <>
          <ellipse cx="16" cy="9" rx="7.5" ry="4" fill={color} />
          <rect x="8" y="8" width="2.5" height="16" rx="1" fill={color} />
          <rect x="21.5" y="8" width="2.5" height="16" rx="1" fill={color} />
          {[10, 13, 16, 19, 22].map((y) => (
            <g key={y}>
              <line x1="8.5" y1={y} x2="10" y2={y} stroke="white" strokeWidth="0.3" opacity="0.1" />
              <line x1="22" y1={y} x2="23.5" y2={y} stroke="white" strokeWidth="0.3" opacity="0.1" />
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
          <path d="M8,17 Q10,18 12,17" fill={color} />
          <path d="M20,17 Q22,18 24,17" fill={color} />
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
