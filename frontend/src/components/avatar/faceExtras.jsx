/* ── Face extras ──
   Blush now uses a softer, more natural tint. */

export function renderFaceExtra(style) {
  switch (style) {
    case 'freckles':
      return (
        <g opacity="0.4">
          {[[11, 16], [13, 16.5], [12, 17.5], [19, 16], [21, 16.5], [20, 17.5]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="0.4" fill="#8b4513" />
          ))}
        </g>
      );
    case 'blush':
      return (
        <>
          <ellipse cx="11" cy="16.5" rx="2" ry="1" fill="#e8878a" opacity="0.2" />
          <ellipse cx="21" cy="16.5" rx="2" ry="1" fill="#e8878a" opacity="0.2" />
        </>
      );
    case 'face_paint':
      return (
        <g opacity="0.5">
          <line x1="10" y1="14" x2="13" y2="15" stroke="#e74c3c" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="10" y1="15" x2="13" y2="16" stroke="#3b82f6" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="19" y1="15" x2="22" y2="14" stroke="#e74c3c" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="19" y1="16" x2="22" y2="15" stroke="#3b82f6" strokeWidth="0.8" strokeLinecap="round" />
        </g>
      );
    case 'scar':
      return (
        <g opacity="0.5">
          <line x1="19" y1="11" x2="21" y2="16" stroke="#cc6666" strokeWidth="0.6" strokeLinecap="round" />
          <line x1="19.5" y1="13" x2="21" y2="13" stroke="#cc6666" strokeWidth="0.4" strokeLinecap="round" />
          <line x1="20" y1="14.5" x2="21.3" y2="14.2" stroke="#cc6666" strokeWidth="0.4" strokeLinecap="round" />
        </g>
      );
    case 'bandage':
      return (
        <>
          <rect x="18" y="11" width="4" height="3" rx="0.5" fill="#f5d6b8" />
          <line x1="19" y1="12" x2="21" y2="12" stroke="#cc6666" strokeWidth="0.3" />
          <line x1="19" y1="13" x2="21" y2="13" stroke="#cc6666" strokeWidth="0.3" />
        </>
      );
    case 'stickers':
      return (
        <g opacity="0.7">
          <text x="21" y="12" fill="#f9d71c" fontSize="3" fontFamily="sans-serif">&#9733;</text>
          <circle cx="10.5" cy="16" r="1" fill="#ff6b9d" opacity="0.6" />
        </g>
      );
    case 'none':
    default:
      return null;
  }
}
