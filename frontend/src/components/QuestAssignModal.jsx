import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useTheme } from '../hooks/useTheme';
import { themedTitle } from '../utils/questThemeText';
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
  const { colorTheme } = useTheme();
  // Per-kid assignment configs: { [kidId]: { selected, recurrence, custom_days, requires_photo } }
  const [kidConfigs, setKidConfigs] = useState({});
  const [expandedKid, setExpandedKid] = useState(null);
  const [rotationEnabled, setRotationEnabled] = useState(false);
  const [rotationCadence, setRotationCadence] = useState('weekly');
  const [rotationFirstKid, setRotationFirstKid] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingRules, setExistingRules] = useState([]);

  // Track whether any heroes were previously assigned (to show unassign warning)
  const [hadExistingAssignments, setHadExistingAssignments] = useState(false);

  // Initialize kid configs
  useEffect(() => {
    if (!isOpen || !chore || !kids.length) return;

    // Fetch existing rules for this chore
    api(`/api/chores/${chore.id}/rules`)
      .then((rules) => {
        const rulesList = Array.isArray(rules) ? rules : [];
        setExistingRules(rulesList);
        const hasActive = rulesList.some((r) => r.is_active);
        setHadExistingAssignments(hasActive);
        const configs = {};
        for (const kid of kids) {
          const existingRule = rulesList.find(
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
        setHadExistingAssignments(false);
      });

    // Fetch existing rotation for this chore
    api(`/api/chores/${chore.id}/rotation`)
      .then((rot) => {
        if (rot && rot.kid_ids && rot.kid_ids.length >= 2) {
          setRotationEnabled(true);
          setRotationCadence(rot.cadence || 'weekly');
          // Restore who currently starts the rotation
          const currentIdx = rot.current_index ?? 0;
          setRotationFirstKid(rot.kid_ids[currentIdx] ?? rot.kid_ids[0]);
        } else {
          setRotationEnabled(false);
          setRotationCadence('weekly');
          setRotationFirstKid(null);
        }
      })
      .catch(() => {
        setRotationEnabled(false);
        setRotationCadence('weekly');
        setRotationFirstKid(null);
      });

    setError('');
  }, [isOpen, chore, kids]);

  const selectedKids = Object.entries(kidConfigs).filter(([, c]) => c.selected);
  const selectedCount = selectedKids.length;
  const isUnassigningAll = hadExistingAssignments && selectedCount === 0;

  // Auto-default rotationFirstKid when rotation is on but no valid first kid is set
  useEffect(() => {
    if (!rotationEnabled || selectedCount < 2) return;
    const selectedIds = selectedKids.map(([id]) => Number(id));
    if (rotationFirstKid == null || !selectedIds.includes(Number(rotationFirstKid))) {
      setRotationFirstKid(selectedIds[0]);
    }
  }, [rotationEnabled, selectedCount, kidConfigs]);

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

  // Toggle photo proof for all selected kids at once
  const togglePhotoAll = () => {
    const anyHasPhoto = selectedKids.some(([, c]) => c.requires_photo);
    const newValue = !anyHasPhoto;
    setKidConfigs((prev) => {
      const next = { ...prev };
      for (const [kidId, config] of Object.entries(next)) {
        if (config.selected) {
          next[kidId] = { ...config, requires_photo: newValue };
        }
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    let assignments = selectedKids.map(([kidId, config]) => ({
      user_id: Number(kidId),
      recurrence: config.recurrence,
      custom_days: config.recurrence === 'custom' ? config.custom_days : null,
      requires_photo: config.requires_photo,
    }));

    const body = { assignments };
    if (rotationEnabled && selectedCount >= 2) {
      // Reorder so the chosen first kid is at index 0 (backend uses kid_ids[0])
      if (rotationFirstKid != null) {
        const firstIdx = assignments.findIndex((a) => a.user_id === Number(rotationFirstKid));
        if (firstIdx > 0) {
          const [first] = assignments.splice(firstIdx, 1);
          assignments.unshift(first);
        }
      }
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

  const allSelectedHavePhoto = selectedCount > 0 && selectedKids.every(([, c]) => c.requires_photo);
  const someSelectedHavePhoto = selectedCount > 0 && selectedKids.some(([, c]) => c.requires_photo);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quest Assignment Scroll"
      actions={[
        { label: 'Cancel', onClick: onClose, className: 'game-btn game-btn-blue' },
        {
          label: submitting
            ? 'Saving...'
            : isUnassigningAll
            ? 'Unassign All'
            : selectedCount === 0
            ? 'Save'
            : 'Assign Quest',
          onClick: handleSubmit,
          className: isUnassigningAll ? 'game-btn game-btn-red' : 'game-btn game-btn-gold',
          disabled: submitting,
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
          <h3 className="text-cream font-bold text-base">{themedTitle(chore.title, colorTheme)}</h3>
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
                    {isSelected && config.requires_photo && (
                      <Camera size={14} className="text-sky flex-shrink-0" />
                    )}
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

                      {/* Per-kid photo proof */}
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

        {/* Unassign warning */}
        {isUnassigningAll && (
          <div className="p-3 rounded-lg border border-crimson/30 bg-crimson/10 text-crimson text-sm">
            No heroes selected. Saving will remove all assignments from this quest.
          </div>
        )}

        {/* Photo proof toggle (applies to all selected kids) */}
        {selectedCount > 0 && (
          <div className="p-3 rounded-lg border border-border bg-surface-raised/20">
            <div className="flex items-center justify-between">
              <label className="text-cream text-sm font-medium flex items-center gap-2">
                <Camera size={14} />
                Require Photo Proof
              </label>
              <button
                type="button"
                onClick={togglePhotoAll}
                className={`relative w-12 h-6 rounded-full border-2 transition-colors ${
                  allSelectedHavePhoto
                    ? 'bg-sky/20 border-sky'
                    : someSelectedHavePhoto
                    ? 'bg-sky/10 border-sky/50'
                    : 'bg-navy-light border-border'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                    allSelectedHavePhoto
                      ? 'left-6 bg-sky'
                      : someSelectedHavePhoto
                      ? 'left-6 bg-sky/50'
                      : 'left-0.5 bg-muted'
                  }`}
                />
              </button>
            </div>
            <p className="text-muted text-xs mt-1">
              {allSelectedHavePhoto
                ? 'All heroes must attach a photo when completing this quest.'
                : someSelectedHavePhoto
                ? 'Some heroes require photo proof. Expand individual settings to adjust.'
                : 'Heroes can complete this quest without attaching a photo.'}
            </p>
          </div>
        )}

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
              <div className="space-y-3">
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
                </div>
                <div>
                  <label className="block text-muted text-xs font-medium mb-1">
                    Starts With
                  </label>
                  <div className="flex gap-2">
                    {selectedKids.map(([kidId]) => {
                      const kid = kids.find((k) => k.id === Number(kidId));
                      if (!kid) return null;
                      const isFirst = Number(kidId) === Number(rotationFirstKid);
                      return (
                        <button
                          key={kidId}
                          type="button"
                          onClick={() => setRotationFirstKid(Number(kidId))}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors text-sm ${
                            isFirst
                              ? 'border-purple bg-purple/15 text-purple'
                              : 'border-border text-muted hover:border-cream/30'
                          }`}
                        >
                          <AvatarDisplay
                            config={kid.avatar_config}
                            size="xs"
                            name={kid.display_name || kid.username}
                          />
                          {kid.display_name || kid.username}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-muted text-xs mt-1">
                    This hero will be assigned the quest first, then it rotates.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
