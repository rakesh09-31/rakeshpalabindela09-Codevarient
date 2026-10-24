import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
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
      <div className="rounded-2xl bg-mint-pale/50 p-4 mb-5">
        <Icon size={32} className="text-forest-light" />
      </div>
      <h3 className="font-display text-xl text-charcoal mb-2">{title}</h3>
      {description && (
        <p className="text-charcoal-light text-sm max-w-md mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
