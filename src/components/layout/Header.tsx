import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  X,
  Menu,
  Sun,
  Moon,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Avatar } from '../ui';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/projects': 'Project Archive',
  '/projects/new': 'Plant Project',
  '/revival-studio': 'Revival Studio',
  '/fusion': 'Project Fusion',
  '/discover': 'Discover Archive',
  '/teams': 'Collectives & Teams',
  '/reminders': 'Reminders',
  '/analytics': 'Archive Analytics',
  '/settings': 'System Settings',
};

export default function Header() {
  const {
    notifications,
    userProfile,
    setMobileDrawerOpen,
    markAllNotificationsRead,
    markNotificationRead,
    theme,
    toggleTheme,
  } = useApp();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Determine current page title
  let pageTitle = pageTitles[location.pathname] || 'Archive';
  if (location.pathname.startsWith('/projects/') && location.pathname !== '/projects/new') {
    pageTitle = location.pathname.includes('/edit') ? 'Edit Project' : 'Project Detail';
  }

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/projects?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="h-[60px] md:h-[68px] bg-[var(--color-topbar)] border-b border-[var(--color-border)] flex items-center justify-between px-4 sm:px-6 md:px-8 sticky top-0 z-30 transition-colors">
      {/* Left: Mobile hamburger + Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
          aria-label="Open navigation drawer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2
            className="text-lg md:text-xl font-semibold text-[var(--color-text)] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {pageTitle}
          </h2>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center">
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search archive…"
                className="w-48 sm:w-64 h-[42px] pl-3.5 pr-9 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/20"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="absolute right-2.5 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
              title="Search projects (⌘K)"
              aria-label="Search projects"
            >
              <Search className="w-4.5 h-4.5" />
            </button>
          )}
        </div>

        {/* Theme Toggle Button (Light/Dark) */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
          title="Switch theme"
          aria-label="Switch theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4.5 h-4.5 text-[var(--color-warning)] transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-4.5 h-4.5 text-[var(--color-brand)] transition-transform hover:-rotate-12" />
          )}
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer relative"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_#C026D3]" />
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] overflow-hidden z-50"
              >
                <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-[var(--color-border)]">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
                      No notifications logged.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`p-3.5 text-xs transition-colors cursor-pointer ${
                          !n.read
                            ? 'bg-[var(--color-brand-soft)]/40 hover:bg-[var(--color-brand-soft)]/60'
                            : 'hover:bg-[var(--color-surface-hover)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-[var(--color-text)]">
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shrink-0 mt-1 shadow-[0_0_6px_#C026D3]" />
                          )}
                        </div>
                        <p className="text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                          {n.message}
                        </p>
                        <span className="text-[11px] text-[var(--color-text-muted)] mt-1.5 block">
                          {new Date(n.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Avatar Menu */}
        <div className="relative pl-1 border-l border-[var(--color-border)]" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
            aria-label="User profile menu"
          >
            <Avatar
              name={userProfile.name || 'Alex Rivera'}
              src={userProfile.avatar}
              size="sm"
            />
            <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)] hidden sm:block" />
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="absolute right-0 mt-2 w-56 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-2 z-50 text-xs"
              >
                <div className="px-3 py-2 border-b border-[var(--color-border)] mb-1">
                  <p className="font-semibold text-[var(--color-text)] truncate">
                    {userProfile.name || 'Alex Rivera'}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                    {userProfile.email || 'alex@gardenofideas.dev'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    navigate('/settings');
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] text-left transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-[var(--color-text-muted)]" />
                  Settings & Preferences
                </button>

                <button
                  onClick={() => {
                    toggleTheme();
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] text-left transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-[var(--color-warning)]" />
                    ) : (
                      <Moon className="w-4 h-4 text-[var(--color-brand)]" />
                    )}
                    Switch Theme
                  </span>
                  <span className="text-[10px] uppercase font-mono text-[var(--color-text-muted)]">{theme}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
