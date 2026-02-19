import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useNotifications } from '../hooks/useNotifications';
import {
  Bell,
  Swords,
  Gift,
  Package,
  CalendarDays,
  Home,
  CheckCheck,
  X,
  Star,
} from 'lucide-react';
import AvatarDisplay from './AvatarDisplay';

const navItems = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Quests', icon: Swords, path: '/chores' },
  { label: 'Rewards', icon: Gift, path: '/rewards' },
  { label: 'Inventory', icon: Package, path: '/inventory' },
  { label: 'Wishlist', icon: Star, path: '/wishlist' },
  { label: 'Calendar', icon: CalendarDays, path: '/calendar' },
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { syncFromUser } = useTheme();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  // Sync color theme from server on login
  useEffect(() => {
    if (user) syncFromUser(user);
  }, [user, syncFromUser]);
  const [showNotifs, setShowNotifs] = useState(false);
  const panelRef = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    if (!showNotifs) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifs]);

  // Close panel on route change
  useEffect(() => {
    setShowNotifs(false);
  }, [location.pathname]);

  const isActive = (path) => path === '/' ? location.pathname === '/' : (location.pathname === path || location.pathname.startsWith(path + '/'));

  return (
    <div className="min-h-screen bg-navy flex">
      {/* ─── Desktop Sidebar ─── */}
      <aside className="hidden md:flex flex-col w-60 bg-surface border-r border-border min-h-screen fixed left-0 top-0 z-30">
        <div
          className="flex items-center gap-3 px-5 py-5 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky to-accent-light flex items-center justify-center">
            <Swords size={16} className="text-white" />
          </div>
          <span className="font-heading text-cream text-lg font-extrabold tracking-tight">QuestOS</span>
        </div>

        <nav className="flex flex-col gap-0.5 px-3 mt-2 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  active
                    ? 'bg-sky/10 text-sky border border-sky/20'
                    : 'text-muted hover:text-cream hover:bg-surface-raised border border-transparent'
                }`}
              >
                <Icon size={18} className={active ? 'text-sky' : ''} />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {user && (
          <div
            className="flex items-center gap-3 px-4 py-4 border-t border-border cursor-pointer hover:bg-surface-raised transition-colors mx-2 mb-2 rounded-lg"
            onClick={() => navigate('/profile')}
          >
            <AvatarDisplay
              config={user.avatar_config}
              size="sm"
              name={user.display_name || user.username}
            />
            <div className="min-w-0">
              <p className="text-cream text-sm font-medium truncate">
                {user.display_name || user.username}
              </p>
              <p className="text-muted text-xs capitalize">{user.role}</p>
            </div>
          </div>
        )}
      </aside>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col md:ml-60 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer md:hidden"
            onClick={() => navigate('/')}
          >
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-sky to-accent-light flex items-center justify-center">
              <Swords size={14} className="text-white" />
            </div>
            <span className="font-heading text-cream text-base font-extrabold tracking-tight">QuestOS</span>
          </div>

          <div className="hidden md:block" />

          <div className="flex items-center gap-2">
            {/* Notification Bell + Dropdown */}
            <div className="relative" ref={panelRef}>
              <button
                onClick={() => setShowNotifs((v) => !v)}
                className="relative p-2 rounded-lg hover:bg-surface-raised transition-colors"
                aria-label="Notifications"
              >
                <Bell size={20} className="text-muted hover:text-cream transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-crimson text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Panel */}
              {showNotifs && (
                <div className="fixed right-2 left-2 sm:left-auto sm:absolute sm:right-0 top-14 sm:top-full sm:mt-2 sm:w-80 max-h-96 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="font-heading text-cream text-sm font-bold">Notifications</span>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-muted hover:text-cream text-xs flex items-center justify-center gap-1 transition-colors min-w-[44px] min-h-[44px]"
                          title="Mark all read"
                        >
                          <CheckCheck size={20} />
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifs(false)}
                        className="text-muted hover:text-cream transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
                      >
                        <X size={22} />
                      </button>
                    </div>
                  </div>

                  {/* Notification List */}
                  <div className="overflow-y-auto max-h-80">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-muted text-sm">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            if (!n.is_read) markRead(n.id);
                          }}
                          className={`w-full text-left px-4 py-3.5 border-b border-border/50 hover:bg-surface-raised transition-colors ${
                            !n.is_read ? 'bg-sky/5' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {!n.is_read && (
                              <span className="mt-1.5 w-2 h-2 rounded-full bg-sky flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-cream text-sm font-medium truncate">
                                {n.title}
                              </p>
                              <p className="text-muted text-xs mt-0.5 line-clamp-2">
                                {n.message}
                              </p>
                              <p className="text-muted/60 text-xs mt-1">
                                {timeAgo(n.created_at)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar (mobile) */}
            {user && (
              <button
                onClick={() => navigate('/profile')}
                className="md:hidden"
                aria-label="Profile"
              >
                <AvatarDisplay
                  config={user.avatar_config}
                  size="sm"
                  name={user.display_name || user.username}
                />
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 md:pb-6 overflow-x-hidden">{children}</main>
      </div>

      {/* ─── Mobile Bottom Nav ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/90 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg transition-all min-w-0 ${
                  active ? 'text-sky' : 'text-muted'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium leading-none truncate">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
