import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import AvatarDisplay from './AvatarDisplay';
import { renderPet, buildPetColors } from './avatar/pets';
import { Save, Loader2, X, Lock, ChevronLeft, ChevronRight, Heart, Star, Crosshair } from 'lucide-react';

const HEAD_OPTIONS = [
  { id: 'round', label: 'Round' },
  { id: 'oval', label: 'Oval' },
  { id: 'square', label: 'Square' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'heart', label: 'Heart' },
  { id: 'long', label: 'Long' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'pear', label: 'Pear' },
  { id: 'wide', label: 'Wide' },
];

const HAIR_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'short', label: 'Short' },
  { id: 'long', label: 'Long' },
  { id: 'spiky', label: 'Spiky' },
  { id: 'curly', label: 'Curly' },
  { id: 'mohawk', label: 'Mohawk' },
  { id: 'buzz', label: 'Buzz' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'bun', label: 'Bun' },
  { id: 'pigtails', label: 'Pigtails' },
  { id: 'afro', label: 'Afro' },
  { id: 'braids', label: 'Braids' },
  { id: 'wavy', label: 'Wavy' },
  { id: 'side_part', label: 'Side Part' },
  { id: 'fade', label: 'Fade' },
  { id: 'dreadlocks', label: 'Dreads' },
  { id: 'bob', label: 'Bob' },
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'undercut', label: 'Undercut' },
  { id: 'twin_buns', label: 'Twin Buns' },
];

const EYES_OPTIONS = [
  { id: 'normal', label: 'Normal' },
  { id: 'happy', label: 'Happy' },
  { id: 'wide', label: 'Wide' },
  { id: 'sleepy', label: 'Sleepy' },
  { id: 'wink', label: 'Wink' },
  { id: 'angry', label: 'Angry' },
  { id: 'dot', label: 'Dot' },
  { id: 'star', label: 'Star' },
  { id: 'glasses', label: 'Glasses' },
  { id: 'sunglasses', label: 'Shades' },
  { id: 'eye_patch', label: 'Eye Patch' },
  { id: 'crying', label: 'Crying' },
  { id: 'heart_eyes', label: 'Hearts' },
  { id: 'dizzy', label: 'Dizzy' },
  { id: 'closed', label: 'Closed' },
];

const MOUTH_OPTIONS = [
  { id: 'smile', label: 'Smile' },
  { id: 'grin', label: 'Grin' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'open', label: 'Open' },
  { id: 'tongue', label: 'Tongue' },
  { id: 'frown', label: 'Frown' },
  { id: 'surprised', label: 'Surprised' },
  { id: 'smirk', label: 'Smirk' },
  { id: 'braces', label: 'Braces' },
  { id: 'vampire', label: 'Vampire' },
  { id: 'whistle', label: 'Whistle' },
  { id: 'mask', label: 'Mask' },
  { id: 'beard', label: 'Beard' },
  { id: 'moustache', label: 'Moustache' },
];

const BODY_OPTIONS = [
  { id: 'slim', label: 'Slim' },
  { id: 'regular', label: 'Regular' },
  { id: 'broad', label: 'Broad' },
];

const HAT_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'crown', label: 'Crown' },
  { id: 'wizard', label: 'Wizard' },
  { id: 'beanie', label: 'Beanie' },
  { id: 'cap', label: 'Cap' },
  { id: 'pirate', label: 'Pirate' },
  { id: 'headphones', label: 'Headphones' },
  { id: 'tiara', label: 'Tiara' },
  { id: 'horns', label: 'Horns' },
  { id: 'bunny_ears', label: 'Bunny Ears' },
  { id: 'cat_ears', label: 'Cat Ears' },
  { id: 'halo', label: 'Halo' },
  { id: 'viking', label: 'Viking' },
];

const ACCESSORY_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'scarf', label: 'Scarf' },
  { id: 'necklace', label: 'Necklace' },
  { id: 'bow_tie', label: 'Bow Tie' },
  { id: 'cape', label: 'Cape' },
  { id: 'wings', label: 'Wings' },
  { id: 'shield', label: 'Shield' },
  { id: 'sword', label: 'Sword' },
];

const FACE_EXTRA_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'freckles', label: 'Freckles' },
  { id: 'blush', label: 'Blush' },
  { id: 'face_paint', label: 'Face Paint' },
  { id: 'scar', label: 'Scar' },
  { id: 'bandage', label: 'Bandage' },
  { id: 'stickers', label: 'Stickers' },
];

const OUTFIT_PATTERN_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'stars', label: 'Stars' },
  { id: 'camo', label: 'Camo' },
  { id: 'tie_dye', label: 'Tie Dye' },
  { id: 'plaid', label: 'Plaid' },
];

const PET_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'cat', label: 'Cat' },
  { id: 'dog', label: 'Dog' },
  { id: 'dragon', label: 'Dragon' },
  { id: 'owl', label: 'Owl' },
  { id: 'bunny', label: 'Bunny' },
  { id: 'phoenix', label: 'Phoenix' },
];

const PET_POSITION_OPTIONS = [
  { id: 'right', label: 'Right' },
  { id: 'left', label: 'Left' },
  { id: 'head', label: 'Head' },
  { id: 'custom', label: 'Custom' },
];

const SKIN_COLORS = [
  '#ffe0bd', '#ffcc99', '#f5d6b8', '#f8d9c0',
  '#e8b88a', '#d4a373', '#c68642', '#a67c52',
  '#8d5524', '#6b3a2a', '#4a2912', '#3b1f0e',
  '#f0c4a8', '#d4956a', '#b07848', '#8a6642',
];

const HAIR_COLORS = [
  '#4a3728', '#1a1a2e', '#8b4513', '#d4a017',
  '#c0392b', '#2e86c1', '#7d3c98', '#27ae60',
  '#e74c3c', '#f39c12', '#ecf0f1', '#ff6b9d',
];

const EYE_COLORS = [
  '#333333', '#1a5276', '#27ae60', '#8b4513',
  '#7d3c98', '#c0392b', '#2e86c1', '#e74c3c',
];

const MOUTH_COLORS = [
  '#cc6666', '#e74c3c', '#d4a373', '#c0392b',
  '#ff6b9d', '#a93226', '#8b4513', '#333333',
];

const BODY_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#a855f7', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#1a1a2e', '#ecf0f1',
];

const BG_COLORS = [
  '#1a1a2e', '#0f0e17', '#16213e', '#1b4332',
  '#4a1942', '#2d1b69', '#1a3a3a', '#3d0c02',
  '#2e86c1', '#27ae60', '#f39c12', '#8e44ad',
];

const HAT_COLORS = [
  '#f39c12', '#e74c3c', '#3b82f6', '#10b981',
  '#a855f7', '#ec4899', '#f59e0b', '#1a1a2e',
  '#c0c0c0', '#f9d71c', '#8b4513', '#ecf0f1',
];

const ACCESSORY_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f39c12',
  '#a855f7', '#ec4899', '#c0c0c0', '#f9d71c',
  '#8b4513', '#1a1a2e', '#ecf0f1', '#06b6d4',
];

const PET_COLORS = [
  '#8b4513', '#4a3728', '#f39c12', '#ef4444',
  '#10b981', '#a855f7', '#ecf0f1', '#1a1a2e',
  '#c0c0c0', '#ff6b9d', '#06b6d4', '#f59e0b',
];

const AVATAR_CONFIG_VERSION = 2;

const DEFAULT_CONFIG = {
  _v: AVATAR_CONFIG_VERSION,
  head: 'round',
  hair: 'short',
  eyes: 'normal',
  mouth: 'smile',
  body: 'regular',
  head_color: '#ffcc99',
  hair_color: '#4a3728',
  eye_color: '#333333',
  mouth_color: '#cc6666',
  body_color: '#3b82f6',
  bg_color: '#1a1a2e',
  hat: 'none',
  hat_color: '#f39c12',
  accessory: 'none',
  accessory_color: '#3b82f6',
  face_extra: 'none',
  outfit_pattern: 'none',
  pet: 'none',
  pet_color: '#8b4513',
  pet_color_body: '',
  pet_color_ears: '',
  pet_color_tail: '',
  pet_color_accent: '',
  pet_position: 'right',
  pet_x: 26,
  pet_y: 20,
};

const CATEGORIES = [
  { id: 'head', label: 'Head' },
  { id: 'skin', label: 'Skin' },
  { id: 'hair', label: 'Hair' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'mouth', label: 'Mouth' },
  { id: 'body', label: 'Body' },
  { id: 'outfit', label: 'Outfit' },
  { id: 'pattern', label: 'Pattern' },
  { id: 'background', label: 'BG' },
  { id: 'hat', label: 'Hat' },
  { id: 'face', label: 'Face' },
  { id: 'accessory', label: 'Gear' },
  { id: 'pet', label: 'Pet' },
];

function ColorSwatch({ colors, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className={`w-7 h-7 rounded-full border-2 transition-all ${
            selected === c ? 'border-sky scale-110' : 'border-transparent hover:border-border-light'
          }`}
          style={{ backgroundColor: c }}
          aria-label={c}
        />
      ))}
    </div>
  );
}

function ShapeSelector({ options, selected, onSelect, lockedItems, configKey, onPreview, onPreviewEnd }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isLocked = lockedItems && lockedItems.has(opt.id);
        return (
          <button
            key={opt.id}
            onClick={() => !isLocked && onSelect(opt.id)}
            onMouseEnter={() => isLocked && configKey && onPreview?.(configKey, opt.id)}
            onMouseLeave={() => isLocked && onPreviewEnd?.()}
            onTouchStart={() => isLocked && configKey && onPreview?.(configKey, opt.id)}
            onTouchEnd={() => isLocked && onPreviewEnd?.()}
            onTouchCancel={() => isLocked && onPreviewEnd?.()}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1 select-none ${
              isLocked
                ? 'border-amber-500/30 text-muted/60 bg-amber-500/5'
                : selected === opt.id
                ? 'border-sky bg-sky/10 text-sky'
                : 'border-border text-muted hover:border-border-light hover:text-cream'
            }`}
            style={isLocked ? { WebkitTouchCallout: 'none', touchAction: 'manipulation' } : undefined}
          >
            {isLocked && <Lock size={10} className="text-amber-500/60" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Pet level thresholds (mirror backend) ──
const PET_LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1200, 2000, 3500];
const PET_LEVEL_NAMES = ['', 'Hatchling', 'Youngling', 'Companion', 'Loyal', 'Brave', 'Mighty', 'Majestic', 'Legendary'];
const PET_LEVEL_COLORS = ['', '#94a3b8', '#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#f97316', '#ef4444', '#d946ef'];

function getPetLevelInfo(petXp) {
  let level = 1;
  for (let i = 0; i < PET_LEVEL_THRESHOLDS.length; i++) {
    if (petXp >= PET_LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  const threshold = PET_LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = PET_LEVEL_THRESHOLDS[level] || null;
  const progress = nextThreshold ? (petXp - threshold) / (nextThreshold - threshold) : 1;
  return { level, name: PET_LEVEL_NAMES[level], nextName: PET_LEVEL_NAMES[level + 1] || null, xp: petXp, threshold, nextThreshold, progress };
}

/** Inline SVG preview of a single pet at larger scale */
function PetPreviewSvg({ petType, colors, level = 1 }) {
  if (!petType || petType === 'none') return null;
  const sc = 1 + (level - 1) * 0.04;
  // Pet center in avatar coords after PET_OFFSETS.right / BIG_PET_OFFSETS.right
  const isBig = ['dragon', 'phoenix'].includes(petType);
  const cx = isBig ? 25 : 26;
  const cy = isBig ? 19 : 20;
  const glowColor = level >= 7 ? '#f59e0b' : level >= 5 ? '#a855f7' : null;
  return (
    <svg width={48} height={48} viewBox="0 0 12 12" className="rounded-lg" style={{ background: '#111827' }}>
      <g transform={`translate(6,6) scale(${sc * 1.3}) translate(${-cx},${-cy})`}>
        {glowColor && <circle cx={cx} cy={cy} r={4} fill={glowColor} opacity="0.2" />}
        {renderPet(petType, colors, 'right', {})}
      </g>
    </svg>
  );
}

/** Tap-to-place overlay for the avatar preview */
function TapToPlaceOverlay({ config, onPlace }) {
  const svgRef = useRef(null);

  const handleClick = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 32);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 32);
    // Clamp to safe bounds
    onPlace(Math.max(4, Math.min(28, x)), Math.max(4, Math.min(28, y)));
  };

  const petX = config.pet_x ?? 26;
  const petY = config.pet_y ?? 20;

  return (
    <div className="relative cursor-crosshair" onClick={handleClick}>
      <div className="avatar-idle rounded-2xl">
        <AvatarDisplay config={config} size="xl" />
      </div>
      {/* Overlay SVG for crosshair indicator */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full rounded-2xl"
        viewBox="0 0 32 32"
        style={{ pointerEvents: 'all' }}
        onClick={(e) => {
          e.stopPropagation();
          const svg = e.currentTarget;
          const rect = svg.getBoundingClientRect();
          const x = Math.round(((e.clientX - rect.left) / rect.width) * 32);
          const y = Math.round(((e.clientY - rect.top) / rect.height) * 32);
          onPlace(Math.max(4, Math.min(28, x)), Math.max(4, Math.min(28, y)));
        }}
      >
        {/* Crosshair at current pet position */}
        <circle cx={petX} cy={petY} r="1.5" fill="none" stroke="#3b82f6" strokeWidth="0.4" className="pet-place-indicator" />
        <line x1={petX - 2} y1={petY} x2={petX + 2} y2={petY} stroke="#3b82f6" strokeWidth="0.3" opacity="0.6" />
        <line x1={petX} y1={petY - 2} x2={petX} y2={petY + 2} stroke="#3b82f6" strokeWidth="0.3" opacity="0.6" />
      </svg>
      <p className="text-center text-sky text-[10px] font-medium mt-1.5 flex items-center justify-center gap-1">
        <Crosshair size={10} /> Tap to place your pet
      </p>
    </div>
  );
}

/** Full pet customisation section */
function PetCustomiser({ config, set, locked, previewProps, petStats }) {
  const hasPet = config.pet && config.pet !== 'none';
  const petXp = config.pet_xp || 0;
  const levelInfo = getPetLevelInfo(petXp);
  const petColors = buildPetColors(config);
  const bodyColor = config.pet_color || '#8b4513';

  // Helper to set a part color, clearing empty strings to inherit
  const setPartColor = (key, val) => {
    set(key, val === bodyColor ? '' : val);
  };

  return (
    <div className="space-y-4">
      {/* Companion picker */}
      <div>
        <p className="text-muted text-xs font-medium mb-2">Companion</p>
        <ShapeSelector options={PET_OPTIONS} selected={config.pet} onSelect={(v) => set('pet', v)} lockedItems={locked} configKey="pet" {...previewProps} />
      </div>

      {hasPet && (
        <>
          {/* ── Pet Level & XP Info ── */}
          <div className="bg-surface-raised/50 rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Heart size={14} className="fill-current" style={{ color: PET_LEVEL_COLORS[levelInfo.level] }} />
                <span className="text-cream text-xs font-bold" style={{ color: PET_LEVEL_COLORS[levelInfo.level] }}>
                  Lv{levelInfo.level} {levelInfo.name}
                </span>
              </div>
              <span className="text-muted text-[10px] font-medium">
                {levelInfo.nextThreshold
                  ? `${petXp} / ${levelInfo.nextThreshold} XP`
                  : `${petXp} XP — MAX`}
              </span>
            </div>

            {/* XP Progress bar */}
            {levelInfo.nextThreshold && (
              <div className="mb-2">
                <div className="h-2 bg-navy rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(levelInfo.progress * 100)}%`,
                      backgroundColor: PET_LEVEL_COLORS[levelInfo.level],
                    }}
                  />
                </div>
                <p className="text-muted text-[10px] mt-1">
                  {levelInfo.nextThreshold - petXp} XP to Level {levelInfo.level + 1} ({levelInfo.nextName})
                </p>
              </div>
            )}

            {/* Next Level Preview */}
            <div className="flex items-center gap-3 mt-2">
              <div className="text-center">
                <p className="text-muted text-[9px] mb-1">Current</p>
                <PetPreviewSvg petType={config.pet} colors={petColors} level={levelInfo.level} />
              </div>
              {levelInfo.nextThreshold ? (
                <div className="text-center opacity-50">
                  <p className="text-muted text-[9px] mb-1">Lv{levelInfo.level + 1}</p>
                  <PetPreviewSvg petType={config.pet} colors={petColors} level={levelInfo.level + 1} />
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gold text-[9px] mb-1 font-bold">MAX</p>
                  <div className="w-12 h-12 rounded-lg bg-navy flex items-center justify-center">
                    <Star size={20} className="text-gold fill-gold" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Position ── */}
          <div>
            <p className="text-muted text-xs font-medium mb-2">Position</p>
            <ShapeSelector options={PET_POSITION_OPTIONS} selected={config.pet_position || 'right'} onSelect={(v) => set('pet_position', v)} />
          </div>

          {/* ── Multi-part Colouring ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted text-xs font-medium">Body Colour</p>
              <button
                onClick={() => {
                  set('pet_color_body', '');
                  set('pet_color_ears', '');
                  set('pet_color_tail', '');
                  set('pet_color_accent', '');
                }}
                className="text-[10px] text-sky hover:text-sky/80 transition-colors"
              >
                Reset all to match
              </button>
            </div>
            <ColorSwatch colors={PET_COLORS} selected={config.pet_color} onSelect={(v) => set('pet_color', v)} />
          </div>

          <div>
            <p className="text-muted text-xs font-medium mb-2">Ears</p>
            <ColorSwatch
              colors={PET_COLORS}
              selected={config.pet_color_ears || config.pet_color || '#8b4513'}
              onSelect={(v) => setPartColor('pet_color_ears', v)}
            />
          </div>

          <div>
            <p className="text-muted text-xs font-medium mb-2">Tail</p>
            <ColorSwatch
              colors={PET_COLORS}
              selected={config.pet_color_tail || config.pet_color || '#8b4513'}
              onSelect={(v) => setPartColor('pet_color_tail', v)}
            />
          </div>

          <div>
            <p className="text-muted text-xs font-medium mb-2">Accent</p>
            <ColorSwatch
              colors={PET_COLORS}
              selected={config.pet_color_accent || config.pet_color || '#8b4513'}
              onSelect={(v) => setPartColor('pet_color_accent', v)}
            />
          </div>
        </>
      )}
    </div>
  );
}

function CategoryContent({ category, config, set, lockedByCategory, onPreview, onPreviewEnd }) {
  const locked = lockedByCategory[category] || new Set();
  const previewProps = { onPreview, onPreviewEnd };
  switch (category) {
    case 'head':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Shape</p>
          <ShapeSelector options={HEAD_OPTIONS} selected={config.head} onSelect={(v) => set('head', v)} lockedItems={locked} configKey="head" {...previewProps} />
        </div>
      );
    case 'skin':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Colour</p>
          <ColorSwatch colors={SKIN_COLORS} selected={config.head_color} onSelect={(v) => set('head_color', v)} />
        </div>
      );
    case 'hair':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Style</p>
          <ShapeSelector options={HAIR_OPTIONS} selected={config.hair} onSelect={(v) => set('hair', v)} lockedItems={locked} configKey="hair" {...previewProps} />
          <p className="text-muted text-xs font-medium">Colour</p>
          <ColorSwatch colors={HAIR_COLORS} selected={config.hair_color} onSelect={(v) => set('hair_color', v)} />
        </div>
      );
    case 'eyes':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Style</p>
          <ShapeSelector options={EYES_OPTIONS} selected={config.eyes} onSelect={(v) => set('eyes', v)} lockedItems={locked} configKey="eyes" {...previewProps} />
          <p className="text-muted text-xs font-medium">Colour</p>
          <ColorSwatch colors={EYE_COLORS} selected={config.eye_color} onSelect={(v) => set('eye_color', v)} />
        </div>
      );
    case 'mouth':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Style</p>
          <ShapeSelector options={MOUTH_OPTIONS} selected={config.mouth} onSelect={(v) => set('mouth', v)} lockedItems={locked} configKey="mouth" {...previewProps} />
          <p className="text-muted text-xs font-medium">Colour</p>
          <ColorSwatch colors={MOUTH_COLORS} selected={config.mouth_color} onSelect={(v) => set('mouth_color', v)} />
        </div>
      );
    case 'body':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Shape</p>
          <ShapeSelector options={BODY_OPTIONS} selected={config.body} onSelect={(v) => set('body', v)} />
        </div>
      );
    case 'outfit':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Colour</p>
          <ColorSwatch colors={BODY_COLORS} selected={config.body_color} onSelect={(v) => set('body_color', v)} />
        </div>
      );
    case 'pattern':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Pattern</p>
          <ShapeSelector options={OUTFIT_PATTERN_OPTIONS} selected={config.outfit_pattern} onSelect={(v) => set('outfit_pattern', v)} lockedItems={locked} configKey="outfit_pattern" {...previewProps} />
        </div>
      );
    case 'background':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Colour</p>
          <ColorSwatch colors={BG_COLORS} selected={config.bg_color} onSelect={(v) => set('bg_color', v)} />
        </div>
      );
    case 'hat':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Style</p>
          <ShapeSelector options={HAT_OPTIONS} selected={config.hat} onSelect={(v) => set('hat', v)} lockedItems={locked} configKey="hat" {...previewProps} />
          <p className="text-muted text-xs font-medium">Colour</p>
          <ColorSwatch colors={HAT_COLORS} selected={config.hat_color} onSelect={(v) => set('hat_color', v)} />
        </div>
      );
    case 'face':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Extra</p>
          <ShapeSelector options={FACE_EXTRA_OPTIONS} selected={config.face_extra} onSelect={(v) => set('face_extra', v)} lockedItems={locked} configKey="face_extra" {...previewProps} />
        </div>
      );
    case 'accessory':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Gear</p>
          <ShapeSelector options={ACCESSORY_OPTIONS} selected={config.accessory} onSelect={(v) => set('accessory', v)} lockedItems={locked} configKey="accessory" {...previewProps} />
          <p className="text-muted text-xs font-medium">Colour</p>
          <ColorSwatch colors={ACCESSORY_COLORS} selected={config.accessory_color} onSelect={(v) => set('accessory_color', v)} />
        </div>
      );
    case 'pet':
      return <PetCustomiser config={config} set={set} locked={locked} previewProps={previewProps} />;
    default:
      return null;
  }
}

const EDITOR_TO_ITEM_CATEGORY = {
  head: 'head', hair: 'hair', eyes: 'eyes', mouth: 'mouth',
  hat: 'hat', accessory: 'accessory', face: 'face_extra',
  pattern: 'outfit_pattern', pet: 'pet',
};

function CategoryStrip({ openCategory, onSelect }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 120, behavior: 'smooth' });
  };

  return (
    <div className="flex-shrink-0 border-b border-border bg-surface px-1 py-2 relative">
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-surface/90 border border-border text-muted hover:text-cream shadow-sm"
          aria-label="Scroll left"
        >
          <ChevronLeft size={14} />
        </button>
      )}

      {/* Scrollable strip */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-0.5 px-2 scrollbar-hide"
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              openCategory === cat.id
                ? 'border-sky bg-sky/15 text-sky'
                : 'border-border text-muted hover:border-border-light hover:text-cream'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-surface/90 border border-border text-muted hover:text-cream shadow-sm"
          aria-label="Scroll right"
        >
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

export default function AvatarEditor({ isOpen, onClose }) {
  const { user, updateUser } = useAuth();
  const [config, setConfig] = useState(() => ({
    ...DEFAULT_CONFIG,
    ...(user?.avatar_config || {}),
  }));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [openCategory, setOpenCategory] = useState('head');
  const [lockedByCategory, setLockedByCategory] = useState({});
  const [preview, setPreview] = useState(null);

  // Fetch avatar items to determine locks
  const fetchLocks = useCallback(async () => {
    try {
      const items = await api('/api/avatar/items');
      if (!Array.isArray(items)) return;
      const lockMap = {};
      for (const item of items) {
        if (!item.unlocked && !item.is_default) {
          if (!lockMap[item.category]) lockMap[item.category] = new Set();
          lockMap[item.category].add(item.item_id);
        }
      }
      setLockedByCategory(lockMap);
    } catch {
      // If fetch fails, don't lock anything
    }
  }, []);

  useEffect(() => { if (isOpen) fetchLocks(); }, [isOpen, fetchLocks]);

  // Reset config from user when opened
  useEffect(() => {
    if (isOpen && user?.avatar_config) {
      setConfig({ ...DEFAULT_CONFIG, ...(user.avatar_config || {}) });
      setMsg('');
      setOpenCategory('head');
    }
  }, [isOpen, user?.avatar_config]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Compute display config (with preview overlay)
  const displayConfig = preview ? { ...config, [preview.key]: preview.value } : config;

  const editorLocks = {};
  for (const [editorCat, itemCat] of Object.entries(EDITOR_TO_ITEM_CATEGORY)) {
    if (lockedByCategory[itemCat]) {
      editorLocks[editorCat] = lockedByCategory[itemCat];
    }
  }

  const set = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setMsg('');
  };

  const handlePreview = useCallback((key, value) => setPreview({ key, value }), []);
  const handlePreviewEnd = useCallback(() => setPreview(null), []);

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await api('/api/avatar', { method: 'PUT', body: { config } });
      updateUser({ avatar_config: res.avatar_config || config });
      setMsg('Saved!');
      setTimeout(() => onClose(), 600);
    } catch (err) {
      setMsg(err.message || 'Failed to save');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          {/* Modal panel — full height with flex layout */}
          <motion.div
            className="relative z-10 flex flex-col w-full max-w-lg mx-auto h-full max-h-[100dvh] sm:max-h-[92vh] sm:my-auto sm:rounded-2xl overflow-hidden bg-surface border-x border-border sm:border"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ─── Pinned top: close button + avatar preview ─── */}
            <div className="flex-shrink-0 border-b border-border bg-surface-raised/50 px-4 pt-3 pb-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-cream text-lg font-bold">Customise Avatar</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-surface-raised transition-colors text-muted hover:text-cream"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex justify-center">
                {openCategory === 'pet' && config.pet_position === 'custom' && config.pet && config.pet !== 'none' ? (
                  <TapToPlaceOverlay
                    config={displayConfig}
                    onPlace={(x, y) => {
                      setConfig((prev) => ({ ...prev, pet_x: x, pet_y: y }));
                      setMsg('');
                    }}
                  />
                ) : (
                  <div className={`avatar-idle rounded-2xl transition-shadow duration-300 ${preview ? 'shadow-[0_0_16px_rgba(245,158,11,0.45)]' : ''}`}>
                    <AvatarDisplay config={displayConfig} size="xl" />
                  </div>
                )}
              </div>
            </div>

            {/* ─── Category strip (pinned, horizontal scroll with arrows) ─── */}
            <CategoryStrip openCategory={openCategory} onSelect={setOpenCategory} />

            {/* ─── Scrollable options area ─── */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
              {openCategory && (
                <CategoryContent
                  category={openCategory}
                  config={config}
                  set={set}
                  lockedByCategory={editorLocks}
                  onPreview={handlePreview}
                  onPreviewEnd={handlePreviewEnd}
                />
              )}
            </div>

            {/* ─── Pinned bottom: save button ─── */}
            <div className="flex-shrink-0 border-t border-border bg-surface-raised/50 px-4 py-3 flex justify-center">
              <button
                onClick={save}
                disabled={saving}
                className="game-btn game-btn-blue flex items-center gap-2 !py-2.5 !px-6 !text-xs shadow-lg shadow-sky/20"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving...' : msg || 'Save Avatar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
