/* ── Body shapes + outfit patterns ── */

export function renderBody(shape, color) {
  switch (shape) {
    case 'slim':
      return (
        <>
          <path d="M12,22 Q11,22 11,24 L11,32 L21,32 L21,24 Q21,22 20,22 Z" fill={color} />
          <path d="M13,22 Q16,23 19,22" stroke="white" strokeWidth="0.3" fill="none" opacity="0.1" />
        </>
      );
    case 'broad':
      return (
        <>
          <path d="M9,22 Q7,22 7,24 L7,32 L25,32 L25,24 Q25,22 23,22 Z" fill={color} />
          <path d="M11,22 Q16,24 21,22" stroke="white" strokeWidth="0.3" fill="none" opacity="0.1" />
        </>
      );
    case 'regular':
    default:
      return (
        <>
          <path d="M11,22 Q9,22 9,24 L9,32 L23,32 L23,24 Q23,22 21,22 Z" fill={color} />
          <path d="M12,22 Q16,23.5 20,22" stroke="white" strokeWidth="0.3" fill="none" opacity="0.1" />
        </>
      );
  }
}

export function renderOutfitPattern(style, bodyShape) {
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
          <text x="13" y="27" fill="white" fontSize="3" fontFamily="sans-serif">&#9733;</text>
          <text x="17" y="29" fill="white" fontSize="3" fontFamily="sans-serif">&#9733;</text>
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
