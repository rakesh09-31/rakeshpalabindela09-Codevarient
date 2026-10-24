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
  Archive,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export const navItems = [
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
  const { sidebarCollapsed, toggleSidebar } = useApp();
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 76 : 248 }}
      transition={{ duration: 0.16, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen bg-[var(--color-sidebar)] border-r border-[var(--color-border)] z-40 flex flex-col transition-colors"
      style={{ width: sidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 h-[68px] border-b border-[var(--color-border)] shrink-0">
        <div className="w-[36px] h-[36px] rounded-[var(--radius-md)] bg-[var(--color-brand)] text-[var(--color-brand-contrast)] flex items-center justify-center shrink-0 shadow-2xs">
          <Archive className="w-4.5 h-4.5 stroke-[2.2]" />
        </div>

        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.14 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h1
                className="text-sm font-bold text-[var(--color-text)] tracking-tight leading-none"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Project Graveyard
              </h1>
              <span className="text-[11px] text-[var(--color-text-muted)] block mt-1 font-normal leading-none">
                Digital Idea Archive
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Primary Action: New Project */}
      <div className="p-3">
        <NavLink to="/projects/new">
          <button
            className={`w-full h-[44px] flex items-center rounded-[var(--radius-md)] font-medium text-sm transition-all duration-150 cursor-pointer shadow-2xs select-none
              bg-[var(--color-brand)] text-[var(--color-text-on-brand)] hover:bg-[var(--color-brand-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]
              ${
                sidebarCollapsed
                  ? 'justify-center p-2'
                  : 'px-3.5 gap-2.5'
              }`}
            title="Create and record a new project"
          >
            <Plus className="w-4.5 h-4.5 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">New Project</span>}
          </button>
        </NavLink>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(({ path, label, icon: Icon, badge }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

          return (
            <NavLink
              key={path}
              to={path}
              className={`
                group relative flex items-center h-[42px] rounded-[var(--radius-md)] text-sm font-medium transition-colors duration-150 cursor-pointer select-none
                ${sidebarCollapsed ? 'justify-center px-2' : 'px-3 gap-3'}
                ${
                  isActive
                    ? 'bg-[var(--color-nav-selected)] text-[var(--color-brand)] font-semibold'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                }
              `}
              title={sidebarCollapsed ? label : undefined}
            >
              {/* 3px Brand Indicator */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[var(--color-brand)]" />
              )}

              <Icon
                className={`w-[18px] h-[18px] shrink-0 ${
                  isActive
                    ? 'text-[var(--color-brand)]'
                    : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]'
                }`}
              />

              {!sidebarCollapsed && (
                <div className="flex items-center justify-between flex-1 truncate">
                  <span className="truncate">{label}</span>
                  {badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-brand)] font-bold">
                      {badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle Footer */}
      <div className="p-3 border-t border-[var(--color-border)] shrink-0">
        <button
          onClick={toggleSidebar}
          className="w-full h-[38px] flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer text-xs"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-medium">Collapse menu</span>
            </div>
          )}
        </button>
      </div>
    </motion.aside>
  );
}

export default Sidebar;
