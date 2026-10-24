import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FolderOpen,
  Sparkles,
  Merge,
  Globe,
  Users,
  Bell,
  BarChart3,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sprout,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/projects', label: 'My Projects', icon: FolderOpen },
  { path: '/revival-studio', label: 'Revival Studio', icon: Sparkles, badge: 'AI' },
  { path: '/fusion', label: 'Project Fusion', icon: Merge, badge: 'AI' },
  { path: '/discover', label: 'Discover', icon: Globe },
  { path: '/teams', label: 'Teams', icon: Users },
  { path: '/reminders', label: 'Reminders', icon: Bell },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, projects } = useApp();
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen bg-white border-r border-gray-green-border/60 z-40 flex flex-col shadow-sm"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-green-border/40">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-forest flex items-center justify-center shadow-xs">
          <Sprout className="w-5 h-5 text-mint-light" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h1 className="text-base font-bold text-forest" style={{ fontFamily: 'var(--font-display)' }}>
                Project Graveyard
              </h1>
              <span className="text-[10px] text-charcoal-light tracking-wide block -mt-0.5">
                Revive Unfinished Ideas
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* New Project Button */}
      <div className="px-3 mt-4 mb-2">
        <NavLink to="/projects/new">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={`w-full flex items-center gap-2 rounded-xl font-semibold transition-colors shadow-xs
              ${
                sidebarCollapsed
                  ? 'justify-center p-2.5 bg-forest text-white hover:bg-forest-light'
                  : 'px-4 py-2.5 bg-forest text-white hover:bg-forest-light'
              }`}
          >
            <Plus className="w-4.5 h-4.5 flex-shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-xs sm:text-sm overflow-hidden whitespace-nowrap"
                >
                  New Project
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(({ path, label, icon: Icon, badge }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <NavLink key={path} to={path}>
              <motion.div
                whileHover={{ x: 2 }}
                className={`flex items-center gap-3 rounded-xl transition-all duration-200 relative
                  ${sidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}
                  ${
                    isActive
                      ? 'bg-mint-pale text-forest font-semibold shadow-2xs'
                      : 'text-charcoal-light hover:bg-ivory-warm hover:text-charcoal'
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-forest rounded-r-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-forest' : ''}`} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap"
                    >
                      <span className="text-xs sm:text-sm">{label}</span>
                      {badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-700">
                          {badge}
                        </span>
                      )}
                      {label === 'My Projects' && (
                        <span className="text-[10px] font-semibold text-charcoal-light">
                          {projects.length}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="mx-3 mb-4 p-2 rounded-xl border border-gray-green-border/60 text-charcoal-light hover:bg-ivory-warm transition-colors flex items-center justify-center"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </motion.aside>
  );
}

export default Sidebar;
