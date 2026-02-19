import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import Modal from './Modal';
import AvatarDisplay from './AvatarDisplay';
import {
  Star,
  RefreshCw,
  Camera,
  Users,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Loader2,
} from 'lucide-react';

const RECURRENCE_OPTIONS = [
  { value: 'once', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom Days' },
];
const CADENCE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DIFFICULTY_LEVEL = { easy: 1, medium: 2, hard: 3, expert: 4 };

const selectClass =
  'bg-navy-light border-2 border-border text-cream p-2 rounded text-sm ' +
  'focus:border-sky focus:outline-none transition-colors';

export default function QuestAssignModal({
  isOpen,
  onClose,
  onAssigned,
  chore,
  kids,
}) {
  // Per-kid assignment configs: { [kidId]: { selected, recurrence, custom_days, requires_photo } }
  const [kidConfigs, setKidConfigs] = useState({});
  const [expandedKid, setExpandedKid] = useState(null);
  const [rotationEnabled, setRotationEnabled] = useState(false);
  const [rotationCadence, setRotationCadence] = useState('weekly');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingRules, setExistingRules] = useState([]);

  // Initialize kid configs
  useEffect(() => {
    if (!isOpen || !chore || !kids.length) return;

    // Fetch existing rules for this chore
    api(`/api/chores/${chore.id}/rules`)
      .then((rules) => {
        setExistingRules(Array.isArray(rules) ? rules : []);
        const configs = {};
        for (const kid of kids) {
          const existingRule = (Array.isArray(rules) ? rules : []).find(
            (r) => r.user_id === kid.id && r.is_active
          );
          configs[kid.id] = existingRule
            ? {
                selected: true,
                recurrence: existingRule.recurrence || 'daily',
                custom_days: existingRule.custom_days || [],
                requires_photo: existingRule.requires_photo || false,
              }
            : {
                selected: false,
                recurrence: 'daily',
                custom_days: [],
                requires_photo: false,
              };
        }
        setKidConfigs(configs);
      })
      .catch(() => {
        const configs = {};
        for (const kid of kids) {
          configs[kid.id] = {
            selected: false,
            recurrence: 'daily',
            custom_days: [],
            requires_photo: false,
          };
        }
        setKidConfigs(configs);
        setExistingRules([]);
      });

    setRotationEnabled(false);
    setRotationCadence('weekly');
    setError('');
  }, [isOpen, chore, kids]);

  const selectedKids = Object.entries(kidConfigs).filter(([, c]) => c.selected);
  const selectedCount = selectedKids.length;

  const toggleKid = (kidId) => {
    setKidConfigs((prev) => ({
      ...prev,
      [kidId]: { ...prev[kidId], selected: !prev[kidId]?.selected },
    }));
  };

  const updateKidConfig = (kidId, field, value) => {
    setKidConfigs((prev) => ({
      ...prev,
      [kidId]: { ...prev[kidId], [field]: value },
    }));
  };

  const toggleCustomDay = (kidId, day) => {
    setKidConfigs((prev) => {
      const current = prev[kidId]?.custom_days || [];
      return {
        ...prev,
        [kidId]: {
          ...prev[kidId],
          custom_days: current.includes(day)
            ? current.filter((d) => d !== day)
            : [...current, day],
        },
      };
    });
  };

  const handleSubmit = async () => {
    if (selectedCount === 0) {
      setError('Select at least one hero to assign this quest to.');
      return;
    }

    setSubmitting(true);
    setError('');

    const assignments = selectedKids.map(([kidId, config]) => ({
      user_id: Number(kidId),
      recurrence: config.recurrence,
      custom_days: config.recurrence === 'custom' ? config.custom_days : null,
      requires_photo: config.requires_photo,
    }));

    const body = { assignments };
    if (rotationEnabled && selectedCount >= 2) {
      body.rotation = { enabled: true, cadence: rotationCadence };
    }

    try {
      await api(`/api/chores/${chore.id}/assign`, { method: 'POST', body });
      onAssigned();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to assign quest.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!chore) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quest Assignment Scroll"
      actions={[
        { label: 'Cancel', onClick: onClose, className: 'game-btn game-btn-blue' },
        {
          label: submitting ? 'Assigning...' : 'Assign Quest',
          onClick: handleSubmit,
          className: 'game-btn game-btn-gold',
          disabled: submitting || selectedCount === 0,
        },
      ]}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-2 rounded border border-crimson/40 bg-crimson/10 text-crimson text-sm">
            {error}
          </div>
        )}

        {/* Quest summary */}
        <div className="p-3 rounded-lg border border-border bg-surface-raised/30">
          <h3 className="text-cream font-bold text-base">{chore.title}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-gold text-sm font-bold">
              <Star size={12} className="fill-gold" />
              {chore.points} XP
            </span>
            <span className="text-muted text-xs capitalize">{chore.difficulty}</span>
            {chore.category && (
              <span className="text-muted text-xs">{chore.category.name || chore.category}</span>
            )}
          </div>
        </div>

        {/* Kid selector */}
        <div>
          <label className="flex items-center gap-2 text-cream text-sm font-medium mb-2">
            <Users size={14} />
            Select Heroes
          </label>
          <div className="space-y-2">
            {kids.map((kid) => {
              const config = kidConfigs[kid.id];
              if (!config) return null;
              const isSelected = config.selected;
              const isExpanded = expandedKid === kid.id && isSelected;

              return (
                <div
                  key={kid.id}
                  className={`rounded-lg border transition-colors ${
                    isSelected ? 'border-sky/40 bg-sky/5' : 'border-border'
                  }`}
                >
                  {/* Kid header row */}
                  <div className="flex items-center gap-3 p-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleKid(kid.id)}
                      className="w-4 h-4 accent-sky flex-shrink-0"
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <AvatarDisplay
                        config={kid.avatar_config}
                        size="xs"
                        name={kid.display_name || kid.username}
                      />
                      <span className="text-cream text-sm font-medium truncate">
                        {kid.display_name || kid.username}
                      </span>
                    </div>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedKid(isExpanded ? null : kid.id)
                        }
                        className="p-1 rounded hover:bg-surface-raised text-muted hover:text-cream transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Expanded per-kid settings */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3 ml-7">
                      {/* Recurrence */}
                      <div>
                        <label className="block text-muted text-xs font-medium mb-1">
                          Recurrence
                        </label>
                        <select
                          value={config.recurrence}
                          onChange={(e) =>
                            updateKidConfig(kid.id, 'recurrence', e.target.value)
                          }
                          className={`${selectClass} w-full`}
                        >
                          {RECURRENCE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Custom days */}
                      {config.recurrence === 'custom' && (
                        <div>
                          <label className="block text-muted text-xs font-medium mb-1">
                            Quest Days
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {DAY_NAMES.map((day, idx) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleCustomDay(kid.id, idx)}
                                className={`px-2 py-1 rounded border text-xs transition-colors ${
                                  config.custom_days.includes(idx)
                                    ? 'border-sky bg-sky/20 text-sky'
                                    : 'border-border text-muted hover:border-cream/30'
                                }`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Photo proof */}
                      <div className="flex items-center justify-between">
                        <label className="text-muted text-xs font-medium flex items-center gap-1.5">
                          <Camera size={12} />
                          Photo Proof
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            updateKidConfig(
                              kid.id,
                              'requires_photo',
                              !config.requires_photo
                            )
                          }
                          className={`relative w-10 h-5 rounded-full border-2 transition-colors ${
                            config.requires_photo
                              ? 'bg-sky/20 border-sky'
                              : 'bg-navy-light border-border'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all ${
                              config.requires_photo
                                ? 'left-5 bg-sky'
                                : 'left-0.5 bg-muted'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rotation section */}
        {selectedCount >= 2 && (
          <div className="p-3 rounded-lg border border-border bg-surface-raised/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-cream text-sm font-medium flex items-center gap-2">
                <RotateCw size={14} />
                Kid Rotation
              </label>
              <button
                type="button"
                onClick={() => setRotationEnabled(!rotationEnabled)}
                className={`relative w-12 h-6 rounded-full border-2 transition-colors ${
                  rotationEnabled
                    ? 'bg-purple/20 border-purple'
                    : 'bg-navy-light border-border'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                    rotationEnabled ? 'left-6 bg-purple' : 'left-0.5 bg-muted'
                  }`}
                />
              </button>
            </div>
            {rotationEnabled && (
              <div>
                <label className="block text-muted text-xs font-medium mb-1">
                  Rotation Cadence
                </label>
                <select
                  value={rotationCadence}
                  onChange={(e) => setRotationCadence(e.target.value)}
                  className={`${selectClass} w-full`}
                >
                  {CADENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-muted text-xs mt-1">
                  The quest will rotate between the selected heroes on this schedule.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
