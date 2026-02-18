import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import {
  ShoppingBag,
  Plus,
  Pencil,
  Trash2,
  Coins,
  CheckCircle2,
  XCircle,
  Package,
  Sparkles,
  Clock,
  Gift,
} from 'lucide-react';

const inputClass =
  'w-full bg-navy-light border-2 border-[#2a2a4a] text-cream p-3 rounded font-body text-lg ' +
  'placeholder:text-cream/30 focus:border-gold focus:outline-none transition-colors';

const selectClass =
  'bg-navy-light border-2 border-[#2a2a4a] text-cream p-3 rounded font-body text-lg w-full ' +
  'focus:border-gold focus:outline-none transition-colors';

const emptyForm = {
  title: '',
  description: '',
  point_cost: 50,
  icon: '',
  stock: '',
  auto_approve_threshold: '',
};

export default function Rewards() {
  const { user } = useAuth();
  const isParent = user?.role === 'parent' || user?.role === 'admin';
  const isKid = user?.role === 'kid';

  // Data state
  const [rewards, setRewards] = useState([]);
  const [pendingRedemptions, setPendingRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Redeem state
  const [redeemingId, setRedeemingId] = useState(null);
  const [redeemMessage, setRedeemMessage] = useState('');

  // Redemption action state
  const [processingRedemption, setProcessingRedemption] = useState(null);

  const userXp = user?.points ?? user?.xp ?? user?.total_points ?? 0;

  const fetchRewards = useCallback(async () => {
    try {
      setError('');
      const data = await api('/api/rewards');
      setRewards(Array.isArray(data) ? data : data.rewards || data.items || []);
    } catch (err) {
      setError(err.message || 'The treasure shop is temporarily closed.');
    }
  }, []);

  const fetchPendingRedemptions = useCallback(async () => {
    if (!isParent) return;
    try {
      const data = await api('/api/rewards/redemptions?status=pending');
      setPendingRedemptions(
        Array.isArray(data) ? data : data.redemptions || data.items || []
      );
    } catch {
      // Non-critical for initial load
    }
  }, [isParent]);

  useEffect(() => {
    Promise.all([fetchRewards(), fetchPendingRedemptions()]).finally(() =>
      setLoading(false)
    );
  }, [fetchRewards, fetchPendingRedemptions]);

  // Form handlers
  const openCreateModal = () => {
    setEditingReward(null);
    setForm({ ...emptyForm });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (reward) => {
    setEditingReward(reward);
    setForm({
      title: reward.title || '',
      description: reward.description || '',
      point_cost: reward.point_cost ?? reward.cost ?? 50,
      icon: reward.icon || '',
      stock: reward.stock != null ? String(reward.stock) : '',
      auto_approve_threshold:
        reward.auto_approve_threshold != null
          ? String(reward.auto_approve_threshold)
          : '',
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingReward(null);
    setFormError('');
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setFormError('Every treasure needs a name!');
      return;
    }
    if (Number(form.point_cost) < 1) {
      setFormError('The cost must be at least 1 gold.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      point_cost: Number(form.point_cost),
      icon: form.icon || undefined,
    };

    if (form.stock !== '') {
      body.stock = Number(form.stock);
    }
    if (form.auto_approve_threshold !== '') {
      body.auto_approve_threshold = Number(form.auto_approve_threshold);
    }

    try {
      if (editingReward) {
        await api(`/api/rewards/${editingReward.id}`, { method: 'PUT', body });
      } else {
        await api('/api/rewards', { method: 'POST', body });
      }
      closeModal();
      await fetchRewards();
    } catch (err) {
      setFormError(err.message || 'Could not save the treasure.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/rewards/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await fetchRewards();
    } catch (err) {
      setError(err.message || 'Failed to remove the treasure.');
    } finally {
      setDeleting(false);
    }
  };

  const handleRedeem = async (reward) => {
    setRedeemingId(reward.id);
    setRedeemMessage('');
    try {
      await api(`/api/rewards/${reward.id}/redeem`, { method: 'POST' });
      setRedeemMessage(`You claimed "${reward.title}"! Check your inventory, hero!`);
      await fetchRewards();
    } catch (err) {
      setRedeemMessage(err.message || 'Redemption failed. The shopkeeper is confused.');
    } finally {
      setRedeemingId(null);
    }
  };

  const handleApproveRedemption = async (redemption) => {
    setProcessingRedemption(redemption.id);
    try {
      await api(`/api/rewards/redemptions/${redemption.id}/approve`, {
        method: 'POST',
      });
      await fetchPendingRedemptions();
    } catch (err) {
      setError(err.message || 'Could not approve redemption.');
    } finally {
      setProcessingRedemption(null);
    }
  };

  const handleDenyRedemption = async (redemption) => {
    setProcessingRedemption(redemption.id);
    try {
      await api(`/api/rewards/redemptions/${redemption.id}/deny`, {
        method: 'POST',
      });
      await fetchPendingRedemptions();
    } catch (err) {
      setError(err.message || 'Could not deny redemption.');
    } finally {
      setProcessingRedemption(null);
    }
  };

  const canAfford = (reward) => {
    return userXp >= (reward.point_cost ?? reward.cost ?? 0);
  };

  const isOutOfStock = (reward) => {
    return reward.stock != null && reward.stock <= 0;
  };

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ShoppingBag size={48} className="text-gold animate-pulse" />
        <p className="text-gold font-heading text-xs animate-pulse">
          The shopkeeper is arranging the treasures...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShoppingBag size={28} className="text-gold" />
          <h1 className="font-heading text-gold text-sm sm:text-base leading-relaxed">
            Treasure Shop
          </h1>
        </div>
        {isParent && (
          <button
            onClick={openCreateModal}
            className="game-btn game-btn-gold flex items-center gap-2"
          >
            <Plus size={16} />
            Add Treasure
          </button>
        )}
      </div>

      {/* Kid XP Balance */}
      {isKid && (
        <div className="game-panel p-5">
          <div className="flex items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gold/20 border-2 border-gold/40 flex items-center justify-center">
              <Coins size={28} className="text-gold" />
            </div>
            <div className="text-center">
              <p className="text-cream/50 font-body text-base">Your Gold Balance</p>
              <p className="text-gold font-heading text-lg sm:text-xl">{userXp} XP</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded border-2 border-crimson/40 bg-crimson/10 text-crimson text-base text-center">
          {error}
        </div>
      )}

      {/* Redeem Message */}
      {redeemMessage && (
        <div
          className={`p-3 rounded border-2 text-base text-center ${
            redeemMessage.toLowerCase().includes('fail') ||
            redeemMessage.toLowerCase().includes('confused') ||
            redeemMessage.toLowerCase().includes('insufficient')
              ? 'border-crimson/40 bg-crimson/10 text-crimson'
              : 'border-emerald/40 bg-emerald/10 text-emerald'
          }`}
        >
          {redeemMessage}
        </div>
      )}

      {/* Rewards Grid */}
      {rewards.length === 0 ? (
        <div className="game-panel p-10 text-center">
          <Gift size={48} className="mx-auto text-cream/20 mb-4" />
          <p className="text-cream/50 text-xl font-body">
            The treasure shop is empty. No loot to be found... yet!
          </p>
          {isParent && (
            <button
              onClick={openCreateModal}
              className="game-btn game-btn-gold mt-4 inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Stock First Treasure
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((reward) => {
            const outOfStock = isOutOfStock(reward);
            const affordable = canAfford(reward);
            const cost = reward.point_cost ?? reward.cost ?? 0;

            return (
              <div
                key={reward.id}
                className={`game-panel p-5 flex flex-col gap-3 relative ${
                  outOfStock ? 'opacity-60' : ''
                }`}
              >
                {/* Icon & Title */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                    {reward.icon ? (
                      <span className="text-2xl">{reward.icon}</span>
                    ) : (
                      <Sparkles size={22} className="text-gold" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading text-cream text-[10px] leading-relaxed">
                      {reward.title}
                    </h3>
                    {reward.description && (
                      <p className="text-cream/50 font-body text-base mt-1 line-clamp-2">
                        {reward.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cost */}
                <div className="flex items-center gap-2">
                  <Coins size={16} className="text-gold" />
                  <span className="text-gold font-heading text-[10px]">{cost} Gold</span>
                </div>

                {/* Stock indicator */}
                {reward.stock != null && (
                  <div className="flex items-center gap-1.5">
                    <Package size={14} className={outOfStock ? 'text-crimson' : 'text-cream/40'} />
                    {outOfStock ? (
                      <span className="text-crimson font-heading text-[9px]">Sold Out</span>
                    ) : (
                      <span className="text-cream/50 font-body text-sm">
                        {reward.stock} left
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-2">
                  {isKid && (
                    <button
                      onClick={() => handleRedeem(reward)}
                      disabled={
                        !affordable || outOfStock || redeemingId === reward.id
                      }
                      className={`game-btn game-btn-gold flex-1 flex items-center justify-center gap-2 ${
                        !affordable || outOfStock
                          ? 'opacity-40 cursor-not-allowed'
                          : ''
                      } ${redeemingId === reward.id ? 'opacity-60 cursor-wait' : ''}`}
                    >
                      <Coins size={14} />
                      {redeemingId === reward.id
                        ? 'Claiming...'
                        : !affordable
                        ? 'Not Enough Gold'
                        : outOfStock
                        ? 'Sold Out'
                        : 'Redeem'}
                    </button>
                  )}

                  {isParent && (
                    <>
                      <button
                        onClick={() => openEditModal(reward)}
                        className="p-2 rounded hover:bg-[#2a2a4a] transition-colors text-cream/40 hover:text-sky"
                        aria-label="Edit reward"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(reward)}
                        className="p-2 rounded hover:bg-[#2a2a4a] transition-colors text-cream/40 hover:text-crimson"
                        aria-label="Delete reward"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Redemptions (Parent view) */}
      {isParent && pendingRedemptions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-gold" />
            <h2 className="font-heading text-gold text-xs">
              Pending Redemptions
            </h2>
            <span className="ml-auto bg-gold/20 text-gold font-heading text-[9px] px-2 py-1 rounded-full">
              {pendingRedemptions.length}
            </span>
          </div>

          <div className="space-y-3">
            {pendingRedemptions.map((redemption) => {
              const isProcessing = processingRedemption === redemption.id;
              return (
                <div
                  key={redemption.id}
                  className="game-panel p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-cream font-heading text-[10px] leading-relaxed">
                      {redemption.reward_title || redemption.reward?.title || 'Reward'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-cream/50 font-body text-base">
                        Requested by{' '}
                        <span className="text-sky">
                          {redemption.kid_name ||
                            redemption.user?.display_name ||
                            redemption.user?.username ||
                            'Hero'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-gold text-sm">
                        <Coins size={12} />
                        {redemption.points || redemption.point_cost || redemption.reward?.point_cost || 0} Gold
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApproveRedemption(redemption)}
                      disabled={isProcessing}
                      className={`game-btn game-btn-gold flex items-center gap-1 ${
                        isProcessing ? 'opacity-60 cursor-wait' : ''
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleDenyRedemption(redemption)}
                      disabled={isProcessing}
                      className={`game-btn game-btn-red flex items-center gap-1 ${
                        isProcessing ? 'opacity-60 cursor-wait' : ''
                      }`}
                    >
                      <XCircle size={14} />
                      Deny
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create/Edit Reward Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingReward ? 'Edit Treasure' : 'New Treasure'}
        actions={[
          {
            label: 'Cancel',
            onClick: closeModal,
            className: 'game-btn game-btn-blue',
          },
          {
            label: submitting
              ? 'Saving...'
              : editingReward
              ? 'Update Treasure'
              : 'Add Treasure',
            onClick: handleSubmit,
            className: 'game-btn game-btn-gold',
            disabled: submitting,
          },
        ]}
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-2 rounded border border-crimson/40 bg-crimson/10 text-crimson text-base">
              {formError}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-gold/80 text-sm font-heading mb-1 tracking-wide">
              Treasure Name
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateForm('title', e.target.value)}
              placeholder="Extra Screen Time"
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gold/80 text-sm font-heading mb-1 tracking-wide">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              placeholder="What does this treasure grant?"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Cost */}
          <div>
            <label className="block text-gold/80 text-sm font-heading mb-1 tracking-wide">
              Cost (Gold)
            </label>
            <input
              type="number"
              min={1}
              value={form.point_cost}
              onChange={(e) => updateForm('point_cost', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-gold/80 text-sm font-heading mb-1 tracking-wide">
              Icon (Emoji)
            </label>
            <input
              type="text"
              value={form.icon}
              onChange={(e) => updateForm('icon', e.target.value)}
              placeholder="e.g. trophy, star, gift"
              className={inputClass}
            />
          </div>

          {/* Stock */}
          <div>
            <label className="block text-gold/80 text-sm font-heading mb-1 tracking-wide">
              Stock (Optional)
            </label>
            <input
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) => updateForm('stock', e.target.value)}
              placeholder="Leave empty for unlimited"
              className={inputClass}
            />
            <p className="text-cream/30 font-body text-sm mt-1">
              Leave empty for unlimited supply.
            </p>
          </div>

          {/* Auto Approve Threshold */}
          <div>
            <label className="block text-gold/80 text-sm font-heading mb-1 tracking-wide">
              Auto-Approve Threshold (Optional)
            </label>
            <input
              type="number"
              min={0}
              value={form.auto_approve_threshold}
              onChange={(e) => updateForm('auto_approve_threshold', e.target.value)}
              placeholder="Max cost to auto-approve"
              className={inputClass}
            />
            <p className="text-cream/30 font-body text-sm mt-1">
              Redemptions at or below this cost are auto-approved.
            </p>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Treasure?"
        actions={[
          {
            label: 'Keep Treasure',
            onClick: () => setDeleteTarget(null),
            className: 'game-btn game-btn-blue',
          },
          {
            label: deleting ? 'Removing...' : 'Remove Treasure',
            onClick: handleDelete,
            className: 'game-btn game-btn-red',
            disabled: deleting,
          },
        ]}
      >
        <p className="text-cream/70">
          Are you sure you want to remove{' '}
          <span className="text-gold font-heading text-[10px]">
            "{deleteTarget?.title}"
          </span>{' '}
          from the treasure shop? Heroes can no longer redeem this reward.
        </p>
      </Modal>
    </div>
  );
}
