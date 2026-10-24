import React from 'react';
import { motion } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
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
      className={`flex gap-1 border-b border-gray-green-border/60 ${className}`}
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
              relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
              transition-colors duration-150 cursor-pointer
              ${
                isActive
                  ? 'text-forest'
                  : 'text-charcoal-light hover:text-charcoal'
              }
            `}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`
                  ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full leading-none
                  ${isActive ? 'bg-mint-pale text-forest' : 'bg-gray-green-light/50 text-charcoal-light'}
                `}
              >
                {tab.count}
              </span>
            )}

            {/* Active indicator */}
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-forest rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

Tabs.displayName = 'Tabs';
