import ChoreIcon from './ChoreIcon';
import { Lock, Star } from 'lucide-react';

export default function BadgeDisplay({ achievement }) {
  if (!achievement) return null;

  const { title, icon, description, unlocked, points_reward } = achievement;

  return (
    <div
      className={`game-panel p-4 flex items-center gap-3 transition-opacity ${
        unlocked ? 'opacity-100' : 'opacity-50'
      }`}
    >
      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
          unlocked
            ? 'bg-purple/20 border border-purple/40'
            : 'bg-surface-raised border border-border'
        }`}
      >
        {unlocked ? (
          <ChoreIcon
            name={icon}
            size={24}
            className="text-purple"
          />
        ) : (
          <Lock size={20} className="text-muted" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium mb-0.5 ${
            unlocked ? 'text-cream' : 'text-muted'
          }`}
        >
          {unlocked ? title : '???'}
        </p>
        <p className="text-muted text-xs truncate">
          {unlocked ? description : 'Locked achievement'}
        </p>
      </div>

      {/* Points Reward */}
      {unlocked && points_reward > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Star size={14} className="text-gold fill-gold" />
          <span className="text-gold text-xs font-bold">
            {points_reward}
          </span>
        </div>
      )}
    </div>
  );
}
