/* ── Mouth styles ──
   Tongue now accepts color prop for tint. Beard opacity uses color directly. */

function MouthSmile({ color }) {
  return <path d="M13,17.5 Q16,20 19,17.5" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />;
}

function MouthGrin({ color }) {
  return (
    <>
      <path d="M12.5,17 Q16,21 19.5,17" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M13,17.5 Q16,19.5 19,17.5" fill="white" opacity="0.6" />
    </>
  );
}

function MouthNeutral({ color }) {
  return <line x1="13.5" y1="18" x2="18.5" y2="18" stroke={color} strokeWidth="1" strokeLinecap="round" />;
}

function MouthOpen({ color }) {
  return (
    <>
      <ellipse cx="16" cy="18" rx="2" ry="1.5" fill={color} />
      <ellipse cx="16" cy="17.5" rx="1.6" ry="0.4" fill="white" opacity="0.5" />
    </>
  );
}

function MouthTongue({ color, mouthColor }) {
  // Tongue tints toward the mouth color instead of hardcoded pink
  const tongueColor = mouthColor || '#e87a9a';
  return (
    <>
      <path d="M13,17.5 Q16,20 19,17.5" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />
      <ellipse cx="16" cy="19" rx="1.5" ry="1" fill={tongueColor} opacity="0.8" />
    </>
  );
}

function MouthFrown({ color }) {
  return <path d="M13,19 Q16,16 19,19" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />;
}

function MouthSurprised({ color }) {
  return (
    <>
      <circle cx="16" cy="18.5" r="1.5" fill={color} />
      <ellipse cx="16" cy="17.8" rx="1" ry="0.3" fill="white" opacity="0.3" />
    </>
  );
}

function MouthSmirk({ color }) {
  return <path d="M13,18 Q15,18 19,16.5" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />;
}

function MouthBraces({ color }) {
  return (
    <>
      <path d="M12.5,17 Q16,20.5 19.5,17" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M13,17.5 Q16,19.5 19,17.5" fill="white" opacity="0.5" />
      <line x1="13" y1="18" x2="19" y2="18" stroke="#c0c0c0" strokeWidth="0.5" />
      {[13.5, 15, 16.5, 18].map((x) => (
        <rect key={x} x={x - 0.3} y={17.6} width="0.6" height="0.8" fill="#c0c0c0" rx="0.1" />
      ))}
    </>
  );
}

function MouthVampire({ color }) {
  return (
    <>
      <path d="M13,17.5 Q16,20 19,17.5" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />
      <polygon points="14,17.5 14.5,20 15,17.5" fill="white" />
      <polygon points="17,17.5 17.5,20 18,17.5" fill="white" />
    </>
  );
}

function MouthWhistle({ color }) {
  return <circle cx="16" cy="18" r="1" fill={color} />;
}

function MouthMask({ color }) {
  return (
    <path
      d="M10,16 Q10,21 16,21 Q22,21 22,16 L22,15.5 Q16,17 10,15.5Z"
      fill={color}
      opacity="0.9"
    />
  );
}

function MouthBeard({ color }) {
  return (
    <>
      <path d="M13,17.5 Q16,20 19,17.5" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M10,17 Q10,24 16,25 Q22,24 22,17 Q19,18 16,18 Q13,18 10,17Z" fill={color} opacity="0.7" />
    </>
  );
}

function MouthMoustache({ color }) {
  return (
    <>
      <line x1="14" y1="18.5" x2="18" y2="18.5" stroke={color} strokeWidth="0.6" strokeLinecap="round" />
      <path d="M11,17 Q13,16 16,17 Q19,16 21,17" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  );
}

export const MOUTH_MAP = {
  smile: MouthSmile,
  grin: MouthGrin,
  neutral: MouthNeutral,
  open: MouthOpen,
  tongue: MouthTongue,
  frown: MouthFrown,
  surprised: MouthSurprised,
  smirk: MouthSmirk,
  braces: MouthBraces,
  vampire: MouthVampire,
  whistle: MouthWhistle,
  mask: MouthMask,
  beard: MouthBeard,
  moustache: MouthMoustache,
};
