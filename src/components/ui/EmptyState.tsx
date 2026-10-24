import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] p-4 mb-4">
        <Icon size={28} className="text-[var(--color-brand)]" />
      </div>
      <h3 className="font-display text-lg sm:text-xl text-[var(--color-text)] mb-1.5">{title}</h3>
      {description && (
        <p className="text-[var(--color-text-secondary)] text-xs sm:text-sm max-w-md mb-5 leading-relaxed">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
export default EmptyState;
