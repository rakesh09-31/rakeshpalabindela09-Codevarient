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
      <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-800 p-4 mb-4">
        <Icon size={28} className="text-zinc-700 dark:text-zinc-300" />
      </div>
      <h3 className="font-display text-lg sm:text-xl text-zinc-900 dark:text-zinc-100 mb-1.5">{title}</h3>
      {description && (
        <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm max-w-md mb-5 leading-relaxed">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
export default EmptyState;
