import { Outlet, NavLink, useLocation } from 'react-router-dom';
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
  X,
  Sprout,
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import Header from './Header';
import { useApp } from '../../contexts/AppContext';

const mobileNavItems = [
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

export function AppLayout() {
  const { sidebarCollapsed, toggleSidebar, projects } = useApp();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#FDFAF5]">
      {/* Sidebar for desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <div className="lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50"
            />

            {/* Slide-over Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col p-4"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-green-border/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-forest flex items-center justify-center text-mint-light">
                    <Sprout className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-forest" style={{ fontFamily: 'var(--font-display)' }}>
                    Project Graveyard
                  </span>
                </div>
                <button
                  onClick={toggleSidebar}
                  className="p-1 rounded-lg text-charcoal-light hover:bg-ivory-warm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="pt-3 pb-2">
                <NavLink to="/projects/new" onClick={toggleSidebar}>
                  <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-forest text-white rounded-xl text-xs font-semibold shadow-xs">
                    <Plus className="w-4 h-4" /> New Project
                  </button>
                </NavLink>
              </div>

              <nav className="flex-1 overflow-y-auto space-y-1 py-2 scrollbar-thin">
                {mobileNavItems.map(({ path, label, icon: Icon, badge }) => {
                  const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
                  return (
                    <NavLink
                      key={path}
                      to={path}
                      onClick={toggleSidebar}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-mint-pale text-forest font-semibold'
                          : 'text-charcoal-light hover:bg-ivory-warm'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-forest' : ''}`} />
                        <span>{label}</span>
                      </div>
                      {badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                          {badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <motion.div
        animate={{
          marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024
            ? sidebarCollapsed ? 72 : 260
            : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="min-h-screen flex flex-col"
      >
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </motion.div>
    </div>
  );
}

export default AppLayout;
