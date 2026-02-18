import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import {
  Bell,
  Swords,
  Gift,
  CalendarDays,
  Trophy,
  UserCircle,
  Settings,
  ShieldCheck,
  Home,
} from 'lucide-react';
import AvatarDisplay from './AvatarDisplay';

function getNavItems(role) {
  const items = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Quests', icon: Swords, path: '/chores' },
    { label: 'Rewards', icon: Gift, path: '/rewards' },
    { label: 'Calendar', icon: CalendarDays, path: '/calendar' },
    { label: 'Board', icon: Trophy, path: '/leaderboard' },
  ];
  if (role === 'parent' || role === 'admin') {
    items.push({ label: 'Settings', icon: Settings, path: '/settings' });
  }
  if (role === 'admin') {
    items.push({ label: 'Admin', icon: ShieldCheck, path: '/admin' });
  }
  return items;
}

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const navItems = getNavItems(user?.role);
  const isActive = (path) => path === '/' ? location.pathname === '/' : (location.pathname === path || location.pathname.startsWith(path + '/'));
  // Bottom nav on mobile: show max 5 most important items
  const mobileNavItems = navItems.slice(0, 5);

  return (
    <div className="min-h-screen bg-navy flex">
      {/* ─── Desktop Sidebar ─── */}
      <aside className="hidden md:flex flex-col w-56 bg-navy-light border-r-3 border-[#2a2a4a] min-h-screen fixed left-0 top-0 z-30">
        {/* Logo */}
        <div
          className="flex items-center gap-2 px-4 py-5 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <span className="font-heading text-gold text-sm tracking-wide">ChoresOS</span>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1 px-3 mt-2 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors text-left ${
                  active
                    ? 'bg-[#2a2a4a] text-gold'
                    : 'text-cream/60 hover:text-cream hover:bg-[#2a2a4a]/50'
                }`}
              >
                <Icon size={20} className={active ? 'text-gold' : ''} />
                <span className="font-body text-lg">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer - User */}
        {user && (
          <div
            className="flex items-center gap-3 px-4 py-4 border-t border-[#2a2a4a] cursor-pointer hover:bg-[#2a2a4a]/50 transition-colors"
            onClick={() => navigate('/profile')}
          >
            <AvatarDisplay
              config={user.avatar_config}
              size="sm"
              name={user.display_name || user.username}
            />
            <div className="min-w-0">
              <p className="text-cream text-sm font-body truncate">
                {user.display_name || user.username}
              </p>
              <p className="text-cream/40 text-xs font-body capitalize">{user.role}</p>
            </div>
          </div>
        )}
      </aside>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col md:ml-56 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-navy-light/95 backdrop-blur-sm border-b border-[#2a2a4a] px-4 py-3 flex items-center justify-between">
          {/* Logo (mobile only) */}
          <div
            className="flex items-center gap-2 cursor-pointer md:hidden"
            onClick={() => navigate('/')}
          >
            <span className="font-heading text-gold text-xs tracking-wide">ChoresOS</span>
          </div>

          {/* Desktop: page spacer */}
          <div className="hidden md:block" />

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-lg hover:bg-[#2a2a4a]/60 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={22} className="text-cream/70 hover:text-cream transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-crimson text-white text-[10px] font-heading min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

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

        {/* Page Content */}
        <main className="flex-1 p-4 pb-24 md:pb-6">{children}</main>
      </div>

      {/* ─── Mobile Bottom Nav ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-navy-light/95 backdrop-blur-sm border-t border-[#2a2a4a]">
        <div className="flex items-center justify-around h-16 px-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 py-1 px-2 rounded-md transition-colors min-w-0 ${
                  active ? 'text-gold' : 'text-cream/40'
                }`}
              >
                <Icon size={20} />
                <span className="font-body text-[11px] leading-none truncate">
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
