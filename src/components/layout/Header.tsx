import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  X,
  Menu,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Avatar } from '../ui';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/projects': 'My Projects',
  '/projects/new': 'New Project',
  '/revival-studio': 'Revival Studio',
  '/fusion': 'Project Fusion',
  '/discover': 'Discover',
  '/teams': 'Teams',
  '/reminders': 'Reminders',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export default function Header() {
  const { notifications, userProfile, toggleSidebar, markAllNotificationsRead } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Get the current page title
  let pageTitle = pageTitles[location.pathname] || '';
  if (location.pathname.startsWith('/projects/') && location.pathname !== '/projects/new') {
    pageTitle = 'Project Detail';
  }
  if (location.pathname.includes('/edit')) {
    pageTitle = 'Edit Project';
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
    <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-green-border/40 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      {/* Left: Mobile menu + Page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl text-charcoal-light hover:bg-ivory-warm transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
          {pageTitle}
        </h2>
      </div>

      {/* Right: Search, Notifications, Profile */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <AnimatePresence>
          {searchOpen ? (
            <motion.form
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSearch}
              className="relative overflow-hidden"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-light" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-gray-green-border bg-ivory focus:outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
              />
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-green-light/30"
              >
                <X className="w-3.5 h-3.5 text-charcoal-light" />
              </button>
            </motion.form>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-xl text-charcoal-light hover:bg-ivory-warm transition-colors"
            >
              <Search className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-charcoal-light hover:bg-ivory-warm transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-gray-green-border/60 shadow-lg overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-green-border/40 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-charcoal">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-xs text-mint hover:text-forest font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-charcoal-light">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-gray-green-border/20 hover:bg-ivory-warm transition-colors cursor-pointer ${
                          !n.read ? 'bg-mint-pale/20' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.read && (
                            <div className="w-2 h-2 rounded-full bg-mint mt-1.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-charcoal truncate">{n.title}</p>
                            <p className="text-xs text-charcoal-light mt-0.5 line-clamp-2">{n.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-ivory-warm transition-colors"
        >
          <Avatar name={userProfile?.name || 'User'} size="sm" />
          <span className="hidden md:block text-sm font-medium text-charcoal">
            {userProfile?.name?.split(' ')[0] || 'User'}
          </span>
        </button>
      </div>
    </header>
  );
}
