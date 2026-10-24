import React from 'react';
import { motion } from 'framer-motion';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div
      className={`flex gap-2 border-b border-[var(--color-border)] overflow-x-auto scrollbar-none ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium
              transition-colors duration-150 cursor-pointer select-none whitespace-nowrap
              ${
                isActive
                  ? 'text-[var(--color-text)] font-semibold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }
            `}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`
                  px-1.5 py-0.5 text-[10px] font-mono rounded-md leading-none
                  ${
                    isActive
                      ? 'bg-[var(--color-brand-soft)] text-[#E879F9] font-bold border border-[#8B2FE8]/40'
                      : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]'
                  }
                `}
              >
                {tab.count}
              </span>
            )}

            {isActive && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] shadow-[0_0_8px_rgba(192,38,211,0.6)]"
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
