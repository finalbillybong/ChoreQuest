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
  CalendarDays,
} from 'lucide-react';

const FREQUENCY_OPTIONS = [
  { value: 'once', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
];
const ROTATION_CADENCE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

  // Per-kid: { [kidId]: { selected, requires_photo } }
  const [kidConfigs, setKidConfigs] = useState({});
  const [expandedKid, setExpandedKid] = useState(null);

  // Shared schedule (applies to all selected kids)
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  const [scheduleDays, setScheduleDays] = useState([]);

  // Rotation (2+ kids only)
  const [rotationEnabled, setRotationEnabled] = useState(false);
  const [rotationCadence, setRotationCadence] = useState('weekly');
  const [rotationFirstKid, setRotationFirstKid] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hadExistingAssignments, setHadExistingAssignments] = useState(false);

  // Initialize
  useEffect(() => {
    if (!isOpen || !chore || !kids.length) return;

    // Fetch existing rules
    api(`/api/chores/${chore.id}/rules`)
      .then((rules) => {
        const rulesList = Array.isArray(rules) ? rules : [];
        const hasActive = rulesList.some((r) => r.is_active);
        setHadExistingAssignments(hasActive);

        // Build kid configs
        const configs = {};
        for (const kid of kids) {
          const existingRule = rulesList.find(
            (r) => r.user_id === kid.id && r.is_active
          );
          configs[kid.id] = {
            selected: !!existingRule,
            requires_photo: existingRule?.requires_photo || false,
          };
        }
        setKidConfigs(configs);

        // Derive shared schedule from first active rule
        const firstActive = rulesList.find((r) => r.is_active);
        if (firstActive) {
          if (firstActive.recurrence === 'custom' && firstActive.custom_days?.length) {
            setScheduleFrequency('daily');
            setScheduleDays(firstActive.custom_days);
          } else {
            setScheduleFrequency(firstActive.recurrence || 'daily');
            setScheduleDays([]);
          }
        } else {
          setScheduleFrequency('daily');
          setScheduleDays([]);
        }
      })
      .catch(() => {
        const configs = {};
        for (const kid of kids) {
          configs[kid.id] = { selected: false, requires_photo: false };
        }
        setKidConfigs(configs);
        setHadExistingAssignments(false);
        setScheduleFrequency('daily');
        setScheduleDays([]);
      });

    // Fetch existing rotation
    api(`/api/chores/${chore.id}/rotation`)
      .then((rot) => {
        if (rot && rot.kid_ids && rot.kid_ids.length >= 2) {
          setRotationEnabled(true);
          setRotationCadence(rot.cadence || 'weekly');
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

  // Auto-default rotationFirstKid
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

  const toggleScheduleDay = (dayIdx) => {
    setScheduleDays((prev) =>
      prev.includes(dayIdx)
        ? prev.filter((d) => d !== dayIdx)
        : [...prev, dayIdx]
    );
  };

  // Toggle photo proof for all selected kids
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

  // Compute the effective recurrence + custom_days from shared schedule
  const getEffectiveSchedule = () => {
    if (scheduleDays.length > 0) {
      return { recurrence: 'custom', custom_days: [...scheduleDays] };
    }
    return { recurrence: scheduleFrequency, custom_days: null };
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    const { recurrence, custom_days } = getEffectiveSchedule();

    let assignments = selectedKids.map(([kidId, config]) => ({
      user_id: Number(kidId),
      recurrence,
      custom_days,
      requires_photo: config.requires_photo,
    }));

    const body = { assignments };

    if (rotationEnabled && selectedCount >= 2) {
      // Reorder so the chosen first kid is at index 0
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
  const hasDaysSelected = scheduleDays.length > 0;

  // Summary text for the schedule
  const scheduleLabel = (() => {
    if (hasDaysSelected) {
      return scheduleDays
        .slice()
        .sort((a, b) => a - b)
        .map((d) => DAY_NAMES[d])
        .join(', ');
    }
    const opt = FREQUENCY_OPTIONS.find((f) => f.value === scheduleFrequency);
    return opt ? opt.label : scheduleFrequency;
  })();

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
                        onClick={() => setExpandedKid(isExpanded ? null : kid.id)}
                        className="p-1 rounded hover:bg-surface-raised text-muted hover:text-cream transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}
                  </div>

                  {/* Expanded: per-kid photo proof only */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-border/50 pt-3 ml-7">
                      <div className="flex items-center justify-between">
                        <label className="text-muted text-xs font-medium flex items-center gap-1.5">
                          <Camera size={12} />
                          Photo Proof
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setKidConfigs((prev) => ({
                              ...prev,
                              [kid.id]: { ...prev[kid.id], requires_photo: !config.requires_photo },
                            }))
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

        {/* Schedule section — shown when 1+ kids selected */}
        {selectedCount > 0 && (
          <div className="p-3 rounded-lg border border-border bg-surface-raised/20 space-y-3">
            <label className="text-cream text-sm font-medium flex items-center gap-2">
              <CalendarDays size={14} />
              Schedule
            </label>

            {/* Frequency dropdown */}
            <div>
              <label className="block text-muted text-xs font-medium mb-1">
                Frequency
                {hasDaysSelected && (
                  <span className="text-sky ml-1">(overridden by quest days)</span>
                )}
              </label>
              <select
                value={scheduleFrequency}
                onChange={(e) => setScheduleFrequency(e.target.value)}
                disabled={hasDaysSelected}
                className={`${selectClass} w-full${hasDaysSelected ? ' opacity-50 cursor-not-allowed' : ''}`}
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Day picker */}
            <div>
              <label className="block text-muted text-xs font-medium mb-1">
                Quest Days
                <span className="text-muted/60 ml-1">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DAY_NAMES.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleScheduleDay(idx)}
                    className={`px-2.5 py-1.5 rounded border text-xs font-medium transition-colors ${
                      scheduleDays.includes(idx)
                        ? 'border-sky bg-sky/20 text-sky'
                        : 'border-border text-muted hover:border-cream/30'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-muted text-xs mt-1">
                {hasDaysSelected
                  ? `Quest appears on ${scheduleDays.slice().sort((a, b) => a - b).map((d) => DAY_NAMES[d]).join(', ')}.`
                  : 'Pick specific days, or leave empty to use the frequency above.'}
              </p>
            </div>
          </div>
        )}

        {/* Photo proof toggle */}
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

        {/* Rotation section — shown when 2+ kids selected */}
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
            <p className="text-muted text-xs">
              Alternate which hero is assigned. The schedule above controls when the quest appears.
            </p>
            {rotationEnabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-muted text-xs font-medium mb-1">
                    Swap Every
                  </label>
                  <select
                    value={rotationCadence}
                    onChange={(e) => setRotationCadence(e.target.value)}
                    className={`${selectClass} w-full`}
                  >
                    {ROTATION_CADENCE_OPTIONS.map((opt) => (
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
                  <div className="flex flex-wrap gap-2">
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
                    This hero gets the quest first, then it rotates.
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
