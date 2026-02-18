import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import {
  Shield,
  Users,
  Key,
  Ticket,
  ScrollText,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';

const TABS = [
  { key: 'users', label: 'Users', icon: Users },
  { key: 'api-keys', label: 'API Keys', icon: Key },
  { key: 'invite-codes', label: 'Invite Codes', icon: Ticket },
  { key: 'audit-log', label: 'Audit Log', icon: ScrollText },
];

// ─── Users Tab ───────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/admin/users');
      setUsers(data.users || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateRole = async (userId, newRole) => {
    try {
      await api(`/api/admin/users/${userId}`, {
        method: 'PUT',
        body: { role: newRole },
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      setError(err.message || 'Failed to update role');
    }
  };

  const toggleActive = async (usr) => {
    try {
      await api(`/api/admin/users/${usr.id}`, {
        method: 'PUT',
        body: { is_active: !usr.is_active },
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === usr.id ? { ...u, is_active: !u.is_active } : u
        )
      );
    } catch (err) {
      setError(err.message || 'Failed to toggle user status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={28} className="text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded border-2 border-crimson/40 bg-crimson/10 text-crimson text-sm">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <p className="text-cream/30 text-center py-8 font-body">
          No heroes in the realm yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-[#2a2a4a]">
                <th className="font-heading text-gold/60 text-[8px] tracking-wider py-3 px-2">
                  Username
                </th>
                <th className="font-heading text-gold/60 text-[8px] tracking-wider py-3 px-2">
                  Display Name
                </th>
                <th className="font-heading text-gold/60 text-[8px] tracking-wider py-3 px-2">
                  Role
                </th>
                <th className="font-heading text-gold/60 text-[8px] tracking-wider py-3 px-2">
                  Status
                </th>
                <th className="font-heading text-gold/60 text-[8px] tracking-wider py-3 px-2">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a4a]/50">
              {users.map((usr) => (
                <tr key={usr.id} className="hover:bg-[#2a2a4a]/20 transition-colors">
                  <td className="py-3 px-2 text-cream font-body text-lg">
                    {usr.username}
                  </td>
                  <td className="py-3 px-2 text-cream/70 font-body text-lg">
                    {usr.display_name || '--'}
                  </td>
                  <td className="py-3 px-2">
                    <select
                      value={usr.role}
                      onChange={(e) => updateRole(usr.id, e.target.value)}
                      className="bg-navy-light border border-[#2a2a4a] text-cream rounded p-1 font-body text-base focus:border-gold focus:outline-none"
                    >
                      <option value="kid">kid</option>
                      <option value="parent">parent</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-heading ${
                        usr.is_active !== false
                          ? 'bg-emerald/10 text-emerald border border-emerald/30'
                          : 'bg-crimson/10 text-crimson border border-crimson/30'
                      }`}
                    >
                      {usr.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <button
                      onClick={() => toggleActive(usr)}
                      className={`game-btn !py-1.5 !px-3 !text-[7px] ${
                        usr.is_active !== false
                          ? 'game-btn-red'
                          : 'game-btn-blue'
                      }`}
                    >
                      {usr.is_active !== false ? (
                        <>
                          <EyeOff size={12} className="inline mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Eye size={12} className="inline mr-1" />
                          Activate
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── API Keys Tab ────────────────────────────────────────────────────
function ApiKeysTab() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create modal
  const [createModal, setCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/admin/api-keys');
      setKeys(data.keys || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreateSubmitting(true);
    try {
      const data = await api('/api/admin/api-keys', {
        method: 'POST',
        body: { name: newKeyName.trim() },
      });
      setNewKeyValue(data.key || data.api_key || data.token || '');
      fetchKeys();
    } catch (err) {
      setError(err.message || 'Failed to create key');
      setCreateModal(false);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const deleteKey = async (id) => {
    try {
      await api(`/api/admin/api-keys/${id}`, { method: 'DELETE' });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete key');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const closeCreateModal = () => {
    setCreateModal(false);
    setNewKeyName('');
    setNewKeyValue('');
    setCopied(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={28} className="text-gold animate-spin" />
      </div>
    );
  }

  const inputClass =
    'w-full bg-navy-light border-2 border-[#2a2a4a] text-cream p-3 rounded font-body text-lg ' +
    'placeholder:text-cream/30 focus:border-gold focus:outline-none transition-colors';

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded border-2 border-crimson/40 bg-crimson/10 text-crimson text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setCreateModal(true)}
          className="game-btn game-btn-gold flex items-center gap-2"
        >
          <Plus size={14} />
          Create Key
        </button>
      </div>

      {keys.length === 0 ? (
        <p className="text-cream/30 text-center py-8 font-body">
          No API keys forged yet.
        </p>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k.id} className="game-panel p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-cream font-body text-lg truncate">
                  {k.name}
                </p>
                <p className="text-cream/40 text-sm font-body">
                  Prefix: <span className="text-sky">{k.prefix || k.key_prefix || '***'}</span>
                  {k.scopes && (
                    <span className="ml-3">
                      Scopes: <span className="text-purple">{Array.isArray(k.scopes) ? k.scopes.join(', ') : k.scopes}</span>
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => deleteKey(k.id)}
                className="p-2 rounded hover:bg-crimson/10 text-crimson/60 hover:text-crimson transition-colors flex-shrink-0"
                title="Delete key"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Key Modal */}
      <Modal
        isOpen={createModal}
        onClose={closeCreateModal}
        title={newKeyValue ? 'Key Created!' : 'Create API Key'}
        actions={
          newKeyValue
            ? [
                {
                  label: 'Done',
                  onClick: closeCreateModal,
                  className: 'game-btn game-btn-gold',
                },
              ]
            : [
                {
                  label: 'Cancel',
                  onClick: closeCreateModal,
                  className: 'game-btn game-btn-red',
                },
                {
                  label: createSubmitting ? 'Creating...' : 'Create',
                  onClick: createKey,
                  className: 'game-btn game-btn-gold',
                  disabled: createSubmitting || !newKeyName.trim(),
                },
              ]
        }
      >
        {newKeyValue ? (
          <div className="space-y-3">
            <p className="text-cream/80 text-base">
              Copy this key now. It will not be shown again!
            </p>
            <div className="flex gap-2">
              <code className="flex-1 bg-navy p-3 rounded border border-gold/30 text-gold text-sm font-body break-all">
                {newKeyValue}
              </code>
              <button
                onClick={() => copyToClipboard(newKeyValue)}
                className="flex-shrink-0 p-2 rounded hover:bg-[#2a2a4a] transition-colors"
                title="Copy"
              >
                {copied ? (
                  <Check size={18} className="text-emerald" />
                ) : (
                  <Copy size={18} className="text-cream/50" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-gold/80 text-sm font-heading mb-2 tracking-wide">
              Key Name
            </label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Mobile App"
              className={inputClass}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Invite Codes Tab ────────────────────────────────────────────────
function InviteCodesTab() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create modal
  const [createModal, setCreateModal] = useState(false);
  const [newRole, setNewRole] = useState('kid');
  const [newMaxUses, setNewMaxUses] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/admin/invite-codes');
      setCodes(data.codes || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load invite codes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const createCode = async () => {
    setCreateSubmitting(true);
    try {
      const body = { role: newRole };
      if (newMaxUses) body.max_uses = parseInt(newMaxUses, 10);
      await api('/api/admin/invite-codes', { method: 'POST', body });
      setCreateModal(false);
      setNewRole('kid');
      setNewMaxUses('');
      fetchCodes();
    } catch (err) {
      setError(err.message || 'Failed to create code');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const deleteCode = async (id) => {
    try {
      await api(`/api/admin/invite-codes/${id}`, { method: 'DELETE' });
      setCodes((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete code');
    }
  };

  const inputClass =
    'w-full bg-navy-light border-2 border-[#2a2a4a] text-cream p-3 rounded font-body text-lg ' +
    'placeholder:text-cream/30 focus:border-gold focus:outline-none transition-colors';

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={28} className="text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded border-2 border-crimson/40 bg-crimson/10 text-crimson text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setCreateModal(true)}
          className="game-btn game-btn-gold flex items-center gap-2"
        >
          <Plus size={14} />
          Create Code
        </button>
      </div>

      {codes.length === 0 ? (
        <p className="text-cream/30 text-center py-8 font-body">
          No invite scrolls crafted yet.
        </p>
      ) : (
        <div className="space-y-3">
          {codes.map((c) => (
            <div key={c.id} className="game-panel p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-gold font-body text-lg tracking-wider">
                  {c.code}
                </p>
                <div className="flex gap-4 mt-1">
                  <span className="text-cream/40 text-sm font-body">
                    Role:{' '}
                    <span className="text-purple">{c.role}</span>
                  </span>
                  <span className="text-cream/40 text-sm font-body">
                    Uses:{' '}
                    <span className="text-sky">
                      {c.use_count ?? c.uses ?? 0}
                      {c.max_uses ? ` / ${c.max_uses}` : ' / unlimited'}
                    </span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => deleteCode(c.id)}
                className="p-2 rounded hover:bg-crimson/10 text-crimson/60 hover:text-crimson transition-colors flex-shrink-0"
                title="Delete code"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Code Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Create Invite Code"
        actions={[
          {
            label: 'Cancel',
            onClick: () => setCreateModal(false),
            className: 'game-btn game-btn-red',
          },
          {
            label: createSubmitting ? 'Creating...' : 'Create',
            onClick: createCode,
            className: 'game-btn game-btn-gold',
            disabled: createSubmitting,
          },
        ]}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-gold/80 text-sm font-heading mb-2 tracking-wide">
              Role
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className={inputClass}
            >
              <option value="kid">kid</option>
              <option value="parent">parent</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div>
            <label className="block text-gold/80 text-sm font-heading mb-2 tracking-wide">
              Max Uses (optional)
            </label>
            <input
              type="number"
              min={1}
              value={newMaxUses}
              onChange={(e) => setNewMaxUses(e.target.value)}
              placeholder="Unlimited"
              className={inputClass}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Audit Log Tab ───────────────────────────────────────────────────
function AuditLogTab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const fetchLog = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api(`/api/admin/audit-log?limit=${limit}&offset=${offset}`);
      setEntries(data.entries || data.logs || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  const formatTimestamp = (ts) => {
    if (!ts) return '--';
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={28} className="text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded border-2 border-crimson/40 bg-crimson/10 text-crimson text-sm">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-cream/30 text-center py-8 font-body">
          The chronicle is empty. No deeds recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-[#2a2a4a]">
                <th className="font-heading text-gold/60 text-[8px] tracking-wider py-3 px-2">
                  Time
                </th>
                <th className="font-heading text-gold/60 text-[8px] tracking-wider py-3 px-2">
                  User
                </th>
                <th className="font-heading text-gold/60 text-[8px] tracking-wider py-3 px-2">
                  Action
                </th>
                <th className="font-heading text-gold/60 text-[8px] tracking-wider py-3 px-2">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a4a]/50">
              {entries.map((entry, idx) => (
                <tr key={entry.id || idx} className="hover:bg-[#2a2a4a]/20 transition-colors">
                  <td className="py-2.5 px-2 text-cream/50 font-body text-base whitespace-nowrap">
                    {formatTimestamp(entry.created_at)}
                  </td>
                  <td className="py-2.5 px-2 text-cream font-body text-base">
                    {entry.user_id != null ? `User #${entry.user_id}` : '--'}
                  </td>
                  <td className="py-2.5 px-2">
                    <span className="text-sky font-body text-base">
                      {entry.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-cream/40 font-body text-sm max-w-xs truncate">
                    {typeof entry.details === 'object'
                      ? JSON.stringify(entry.details)
                      : entry.details || '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2a2a4a]">
        <button
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className={`game-btn game-btn-blue !py-2 !px-3 flex items-center gap-1 ${
            offset === 0 ? 'opacity-30 cursor-not-allowed' : ''
          }`}
        >
          <ChevronLeft size={14} />
          Prev
        </button>

        <span className="text-cream/40 font-body text-sm">
          Showing {offset + 1} - {offset + entries.length}
        </span>

        <button
          onClick={() => setOffset(offset + limit)}
          disabled={entries.length < limit}
          className={`game-btn game-btn-blue !py-2 !px-3 flex items-center gap-1 ${
            entries.length < limit ? 'opacity-30 cursor-not-allowed' : ''
          }`}
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main AdminDashboard ─────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <Shield size={48} className="text-crimson/30 mx-auto mb-4" />
        <h1 className="font-heading text-crimson text-xs mb-2">
          Access Denied
        </h1>
        <p className="text-cream/40 font-body text-lg">
          Only realm administrators may enter this sanctum.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Shield size={28} className="text-gold" />
        <h1 className="font-heading text-gold text-xs sm:text-sm leading-relaxed">
          Admin Sanctum
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 rounded-t-md border-b-3 transition-colors font-heading text-[8px] tracking-wider whitespace-nowrap ${
                isActive
                  ? 'bg-[#2a2a4a]/50 border-gold text-gold'
                  : 'border-transparent text-cream/40 hover:text-cream/70 hover:bg-[#2a2a4a]/20'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="game-panel p-5">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'api-keys' && <ApiKeysTab />}
        {activeTab === 'invite-codes' && <InviteCodesTab />}
        {activeTab === 'audit-log' && <AuditLogTab />}
      </div>
    </div>
  );
}
