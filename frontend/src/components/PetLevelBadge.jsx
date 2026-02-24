import { Heart } from 'lucide-react';

const LEVEL_COLORS = [
  '', // 0 unused
  'text-slate-400',    // 1 Hatchling
  'text-emerald',      // 2 Youngling
  'text-sky',          // 3 Companion
  'text-purple',       // 4 Loyal
  'text-gold',         // 5 Brave
  'text-orange-400',   // 6 Mighty
  'text-crimson',      // 7 Majestic
  'text-fuchsia-400',  // 8 Legendary
];

export default function PetLevelBadge({ pet, compact = false }) {
  if (!pet) return null;

  const color = LEVEL_COLORS[pet.level] || LEVEL_COLORS[1];

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${color}`}>
        <Heart size={8} className="fill-current" />
        Lv{pet.level}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 text-xs font-bold ${color}`}>
        <Heart size={12} className="fill-current" />
        Lv{pet.level} {pet.name}
      </span>
      {pet.next_threshold && (
        <div className="flex-1 max-w-[80px]">
          <div className="h-1.5 bg-navy rounded-full overflow-hidden">
            <div
              className="h-full bg-current rounded-full transition-all duration-500"
              style={{ width: `${Math.round(pet.progress * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
