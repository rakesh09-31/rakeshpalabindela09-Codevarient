import { useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Archive,
} from 'lucide-react';
import { Sidebar, navItems } from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import { useApp } from '../../contexts/AppContext';

export function AppLayout() {
  const { sidebarCollapsed, mobileDrawerOpen, setMobileDrawerOpen } = useApp();
  const location = useLocation();
  const isFixedWorkspace =
    location.pathname === '/revival-studio' ||
    location.pathname === '/fusion' ||
    location.pathname === '/project-fusion';

  // Handle Escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileDrawerOpen, setMobileDrawerOpen]);

  return (
    <div className="h-screen h-[100dvh] overflow-hidden flex flex-col bg-[var(--color-page)] text-[var(--color-text)] transition-colors">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            {/* Slide-over Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-[var(--color-sidebar)] border-r border-[var(--color-border)] shadow-[var(--shadow-popover)] flex flex-col p-4 z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-[34px] h-[34px] rounded-[var(--radius-md)] bg-gradient-to-br from-[#8B2FE8] to-[#C026D3] text-white flex items-center justify-center shadow-[0_0_12px_rgba(139,47,232,0.4)]">
                    <Archive className="w-4 h-4" />
                  </div>
                  <div>
                    <h3
                      className="font-bold text-sm text-[var(--color-text)]"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      Project Graveyard
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      Digital Idea Archive
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Button */}
              <div className="pt-3 pb-2">
                <NavLink to="/projects/new" onClick={() => setMobileDrawerOpen(false)}>
                  <button className="w-full h-[42px] flex items-center justify-center gap-2 bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] text-white rounded-[var(--radius-md)] text-xs font-semibold shadow-[0_0_15px_rgba(139,47,232,0.35)] border border-white/15 transition-all">
                    <Plus className="w-4 h-4" /> New Project
                  </button>
                </NavLink>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 overflow-y-auto space-y-1 py-2 scrollbar-thin">
                {navItems.map(({ path, label, icon: Icon, badge }) => {
                  const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
                  return (
                    <NavLink
                      key={path}
                      to={path}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`
                        flex items-center justify-between px-3 h-[42px] rounded-[var(--radius-md)] text-xs font-medium transition-colors
                        ${
                          isActive
                            ? 'bg-[var(--color-nav-selected)] text-white border border-[#8B2FE8]/40 font-semibold shadow-[0_0_12px_rgba(139,47,232,0.18)]'
                            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </div>
                      {badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-brand)] font-bold">
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

      {/* Main Content Column */}
      <div
        className={`flex-1 min-h-0 flex flex-col transition-all duration-200 overflow-hidden ${
          sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[248px]'
        }`}
      >
        <Header />
        {isFixedWorkspace ? (
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col px-4 sm:px-6 md:px-8 py-3 sm:py-4 w-full max-w-[1440px] mx-auto">
            <Outlet />
          </main>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col">
            <main className="flex-1 px-4 sm:px-6 md:px-8 py-8 w-full max-w-[1440px] mx-auto">
              <Outlet />
            </main>
            <Footer />
          </div>
        )}
      </div>
    </div>
  );
}

export default AppLayout;
