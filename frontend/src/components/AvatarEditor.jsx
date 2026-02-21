import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Save, Loader2, ChevronDown } from 'lucide-react';

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

const SKIN_COLORS = [
  '#ffcc99', '#f5d6b8', '#d4a373', '#a67c52',
  '#8d5524', '#6b3a2a', '#f8d9c0', '#c68642',
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

const DEFAULT_CONFIG = {
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

function ShapeSelector({ options, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            selected === opt.id
              ? 'border-sky bg-sky/10 text-sky'
              : 'border-border text-muted hover:border-border-light hover:text-cream'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CategoryContent({ category, config, set }) {
  switch (category) {
    case 'head':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Shape</p>
          <ShapeSelector options={HEAD_OPTIONS} selected={config.head} onSelect={(v) => set('head', v)} />
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
          <ShapeSelector options={HAIR_OPTIONS} selected={config.hair} onSelect={(v) => set('hair', v)} />
          <p className="text-muted text-xs font-medium">Colour</p>
          <ColorSwatch colors={HAIR_COLORS} selected={config.hair_color} onSelect={(v) => set('hair_color', v)} />
        </div>
      );
    case 'eyes':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Style</p>
          <ShapeSelector options={EYES_OPTIONS} selected={config.eyes} onSelect={(v) => set('eyes', v)} />
          <p className="text-muted text-xs font-medium">Colour</p>
          <ColorSwatch colors={EYE_COLORS} selected={config.eye_color} onSelect={(v) => set('eye_color', v)} />
        </div>
      );
    case 'mouth':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Style</p>
          <ShapeSelector options={MOUTH_OPTIONS} selected={config.mouth} onSelect={(v) => set('mouth', v)} />
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
          <ShapeSelector options={OUTFIT_PATTERN_OPTIONS} selected={config.outfit_pattern} onSelect={(v) => set('outfit_pattern', v)} />
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
          <ShapeSelector options={HAT_OPTIONS} selected={config.hat} onSelect={(v) => set('hat', v)} />
          <p className="text-muted text-xs font-medium">Colour</p>
          <ColorSwatch colors={HAT_COLORS} selected={config.hat_color} onSelect={(v) => set('hat_color', v)} />
        </div>
      );
    case 'face':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Extra</p>
          <ShapeSelector options={FACE_EXTRA_OPTIONS} selected={config.face_extra} onSelect={(v) => set('face_extra', v)} />
        </div>
      );
    case 'accessory':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Gear</p>
          <ShapeSelector options={ACCESSORY_OPTIONS} selected={config.accessory} onSelect={(v) => set('accessory', v)} />
          <p className="text-muted text-xs font-medium">Colour</p>
          <ColorSwatch colors={ACCESSORY_COLORS} selected={config.accessory_color} onSelect={(v) => set('accessory_color', v)} />
        </div>
      );
    case 'pet':
      return (
        <div className="space-y-3">
          <p className="text-muted text-xs font-medium">Companion</p>
          <ShapeSelector options={PET_OPTIONS} selected={config.pet} onSelect={(v) => set('pet', v)} />
          <p className="text-muted text-xs font-medium">Colour</p>
          <ColorSwatch colors={PET_COLORS} selected={config.pet_color} onSelect={(v) => set('pet_color', v)} />
        </div>
      );
    default:
      return null;
  }
}

export default function AvatarEditor({ onConfigChange }) {
  const { user, updateUser } = useAuth();
  const [config, setConfig] = useState(() => ({
    ...DEFAULT_CONFIG,
    ...(user?.avatar_config || {}),
  }));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [openCategory, setOpenCategory] = useState(null);

  useEffect(() => {
    if (user?.avatar_config && Object.keys(user.avatar_config).length > 0) {
      setConfig((prev) => ({ ...DEFAULT_CONFIG, ...prev, ...user.avatar_config }));
    }
  }, [user?.avatar_config]);

  // Notify parent of config changes so the profile avatar updates live
  useEffect(() => {
    onConfigChange?.(config);
  }, [config, onConfigChange]);

  const set = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setMsg('');
  };

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await api('/api/avatar', { method: 'PUT', body: { config } });
      updateUser({ avatar_config: res.avatar_config || config });
      setMsg('Avatar saved!');
    } catch (err) {
      setMsg(err.message || 'Failed to save');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const toggleCategory = (id) => {
    setOpenCategory((prev) => (prev === id ? null : id));
  };

  return (
    <div>
      {/* Save bar */}
      <div className="game-panel p-3 flex items-center justify-between gap-3 mb-3">
        <h2 className="text-cream text-sm font-bold">
          Customise Avatar
        </h2>
        <div className="flex items-center gap-2">
          {msg && (
            <p className={`text-xs ${msg.includes('!') ? 'text-emerald' : 'text-crimson'}`}>
              {msg}
            </p>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="game-btn game-btn-blue flex items-center gap-2 !py-2 !text-xs"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? 'Saving...' : 'Save Avatar'}
          </button>
        </div>
      </div>

      {/* Category buttons + expandable options */}
      <div className="game-panel p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                openCategory === cat.id
                  ? 'border-sky bg-sky/15 text-sky'
                  : 'border-border text-muted hover:border-border-light hover:text-cream'
              }`}
            >
              {cat.label}
              <ChevronDown
                size={12}
                className={`transition-transform ${openCategory === cat.id ? 'rotate-180' : ''}`}
              />
            </button>
          ))}
        </div>

        {/* Expanded options panel */}
        {openCategory && (
          <div className="pt-2 pb-1 border-t border-border/50">
            <CategoryContent category={openCategory} config={config} set={set} />
          </div>
        )}
      </div>
    </div>
  );
}
