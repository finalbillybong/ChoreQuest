/* ── Eye styles ──
   Enhanced with pupils, highlights, and proper color usage.
   Eye patch now uses a dark overlay instead of hardcoded color. */

function EyesNormal({ color }) {
  return (
    <>
      <ellipse cx="12.75" cy="13.5" rx="1.5" ry="1.6" fill="white" opacity="0.9" />
      <ellipse cx="12.75" cy="13.7" rx="1.1" ry="1.2" fill={color} />
      <circle cx="13.1" cy="13.3" r="0.35" fill="white" />
      <ellipse cx="19.25" cy="13.5" rx="1.5" ry="1.6" fill="white" opacity="0.9" />
      <ellipse cx="19.25" cy="13.7" rx="1.1" ry="1.2" fill={color} />
      <circle cx="19.6" cy="13.3" r="0.35" fill="white" />
    </>
  );
}

function EyesHappy({ color }) {
  return (
    <>
      <path d="M11.5,14 Q12.75,12 14,14" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M18,14 Q19.25,12 20.5,14" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  );
}

function EyesWide({ color }) {
  return (
    <>
      <circle cx="12.75" cy="13.5" r="2.2" fill="white" />
      <circle cx="12.75" cy="13.7" r="1.3" fill={color} />
      <circle cx="12.75" cy="13.7" r="0.6" fill="#111" />
      <circle cx="13.1" cy="13.2" r="0.4" fill="white" />
      <circle cx="19.25" cy="13.5" r="2.2" fill="white" />
      <circle cx="19.25" cy="13.7" r="1.3" fill={color} />
      <circle cx="19.25" cy="13.7" r="0.6" fill="#111" />
      <circle cx="19.6" cy="13.2" r="0.4" fill="white" />
    </>
  );
}

function EyesSleepy({ color }) {
  return (
    <>
      <line x1="11" y1="14" x2="14" y2="14" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="18" y1="14" x2="21" y2="14" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </>
  );
}

function EyesWink({ color }) {
  return (
    <>
      <ellipse cx="12.75" cy="13.5" rx="1.5" ry="1.6" fill="white" opacity="0.9" />
      <ellipse cx="12.75" cy="13.7" rx="1.1" ry="1.2" fill={color} />
      <circle cx="13.1" cy="13.3" r="0.35" fill="white" />
      <path d="M18,14 Q19.25,12 20.5,14" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  );
}

function EyesAngry({ color }) {
  return (
    <>
      <line x1="11" y1="12" x2="14" y2="13" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
      <ellipse cx="12.75" cy="14" rx="1.3" ry="1.2" fill="white" opacity="0.9" />
      <ellipse cx="12.75" cy="14.1" rx="1" ry="0.9" fill={color} />
      <line x1="21" y1="12" x2="18" y2="13" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
      <ellipse cx="19.25" cy="14" rx="1.3" ry="1.2" fill="white" opacity="0.9" />
      <ellipse cx="19.25" cy="14.1" rx="1" ry="0.9" fill={color} />
    </>
  );
}

function EyesDot({ color }) {
  return (
    <>
      <circle cx="12.75" cy="14" r="1" fill={color} />
      <circle cx="19.25" cy="14" r="1" fill={color} />
    </>
  );
}

function EyesStar({ color }) {
  return (
    <>
      <text x="12.75" y="15.5" textAnchor="middle" fill={color} fontSize="5" fontFamily="sans-serif">&#9733;</text>
      <text x="19.25" y="15.5" textAnchor="middle" fill={color} fontSize="5" fontFamily="sans-serif">&#9733;</text>
    </>
  );
}

function EyesGlasses({ color }) {
  return (
    <>
      <circle cx="12.75" cy="13.5" r="2.5" fill="none" stroke={color} strokeWidth="0.8" />
      <circle cx="19.25" cy="13.5" r="2.5" fill="none" stroke={color} strokeWidth="0.8" />
      <line x1="15.25" y1="13.5" x2="16.75" y2="13.5" stroke={color} strokeWidth="0.8" />
      <line x1="10.25" y1="13.5" x2="9" y2="12.5" stroke={color} strokeWidth="0.6" />
      <line x1="21.75" y1="13.5" x2="23" y2="12.5" stroke={color} strokeWidth="0.6" />
      <circle cx="12.75" cy="13.7" r="0.9" fill={color} />
      <circle cx="19.25" cy="13.7" r="0.9" fill={color} />
      <circle cx="13" cy="13.3" r="0.3" fill="white" />
      <circle cx="19.5" cy="13.3" r="0.3" fill="white" />
    </>
  );
}

function EyesSunglasses({ color }) {
  return (
    <>
      <rect x="10" y="12" width="5.5" height="3.5" rx="1" fill={color} />
      <rect x="16.5" y="12" width="5.5" height="3.5" rx="1" fill={color} />
      <line x1="15.5" y1="13.5" x2="16.5" y2="13.5" stroke={color} strokeWidth="0.8" />
      <line x1="10" y1="13" x2="8.5" y2="12" stroke={color} strokeWidth="0.7" />
      <line x1="22" y1="13" x2="23.5" y2="12" stroke={color} strokeWidth="0.7" />
      {/* lens glare */}
      <line x1="11" y1="12.8" x2="12" y2="12.8" stroke="white" strokeWidth="0.4" opacity="0.3" strokeLinecap="round" />
      <line x1="17.5" y1="12.8" x2="18.5" y2="12.8" stroke="white" strokeWidth="0.4" opacity="0.3" strokeLinecap="round" />
    </>
  );
}

function EyesEyePatch({ color }) {
  return (
    <>
      <ellipse cx="12.75" cy="13.5" rx="1.5" ry="1.6" fill="white" opacity="0.9" />
      <ellipse cx="12.75" cy="13.7" rx="1.1" ry="1.2" fill={color} />
      <circle cx="13.1" cy="13.3" r="0.35" fill="white" />
      <ellipse cx="19.25" cy="13.5" rx="3" ry="2.5" fill="#222" />
      <line x1="9" y1="10" x2="22" y2="10" stroke="#222" strokeWidth="0.6" />
    </>
  );
}

function EyesCrying({ color }) {
  return (
    <>
      <ellipse cx="12.75" cy="13.5" rx="1.5" ry="1.6" fill="white" opacity="0.9" />
      <ellipse cx="12.75" cy="13.7" rx="1.1" ry="1.2" fill={color} />
      <ellipse cx="19.25" cy="13.5" rx="1.5" ry="1.6" fill="white" opacity="0.9" />
      <ellipse cx="19.25" cy="13.7" rx="1.1" ry="1.2" fill={color} />
      <ellipse cx="13" cy="17" rx="0.6" ry="1.2" fill="#64dfdf" opacity="0.6" />
      <ellipse cx="19.5" cy="17" rx="0.6" ry="1.2" fill="#64dfdf" opacity="0.6" />
    </>
  );
}

function EyesHeartEyes({ color }) {
  return (
    <>
      <path d="M12.75,12.5 L11.5,13.5 L12.75,15 L14,13.5Z" fill={color} />
      <path d="M19.25,12.5 L18,13.5 L19.25,15 L20.5,13.5Z" fill={color} />
    </>
  );
}

function EyesDizzy({ color }) {
  return (
    <>
      <line x1="11" y1="12" x2="14.5" y2="15.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <line x1="14.5" y1="12" x2="11" y2="15.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <line x1="17.5" y1="12" x2="21" y2="15.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <line x1="21" y1="12" x2="17.5" y2="15.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
    </>
  );
}

function EyesClosed({ color }) {
  return (
    <>
      <path d="M11,14 Q12.75,15.5 14.5,14" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M17.5,14 Q19.25,15.5 21,14" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  );
}

export const EYES_MAP = {
  normal: EyesNormal,
  happy: EyesHappy,
  wide: EyesWide,
  sleepy: EyesSleepy,
  wink: EyesWink,
  angry: EyesAngry,
  dot: EyesDot,
  star: EyesStar,
  glasses: EyesGlasses,
  sunglasses: EyesSunglasses,
  eye_patch: EyesEyePatch,
  crying: EyesCrying,
  heart_eyes: EyesHeartEyes,
  dizzy: EyesDizzy,
  closed: EyesClosed,
};
