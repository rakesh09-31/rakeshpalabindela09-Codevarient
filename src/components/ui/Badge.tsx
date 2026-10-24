import React from 'react';
import { ProjectStatus, Priority, ProjectVisibility } from '../../types';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?:
    | 'default'
    | 'subtle'
    | 'outline'
    | 'solid'
    | 'tech'
    | 'tag'
    | 'accent'
    | 'brand'
    | 'status-active'
    | 'status-paused'
    | 'status-abandoned'
    | 'status-completed'
    | 'status-archived'
    | 'status-revived'
    | 'priority-low'
    | 'priority-medium'
    | 'priority-high'
    | 'priority-critical'
    | string;
  status?: ProjectStatus;
  priority?: Priority;
  visibility?: ProjectVisibility;
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  status,
  priority,
  size = 'md',
  className = '',
  dot = false,
}) => {
  let styleClass =
    'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)]';
  let prefixSymbol: React.ReactNode = null;

  if (status) {
    switch (status) {
      case 'active':
        styleClass =
          'bg-[var(--color-brand-soft)] text-[var(--color-brand)] border-[var(--color-brand)]/20 font-medium';
        prefixSymbol = <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)] mr-1.5 inline-block shrink-0" />;
        break;
      case 'paused':
        styleClass =
          'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning)]/20 font-medium';
        prefixSymbol = <span className="text-[10px] font-mono mr-1 shrink-0">❚❚</span>;
        break;
      case 'abandoned':
        styleClass =
          'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border-[var(--color-border)] line-through decoration-[var(--color-text-muted)]';
        break;
      case 'revived':
        styleClass =
          'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]/20 font-semibold';
        prefixSymbol = <span className="text-[11px] mr-1 shrink-0">↺</span>;
        break;
      case 'completed':
        styleClass =
          'bg-[var(--color-success-soft)] text-[var(--color-success)] border-[var(--color-success)]/20 font-medium';
        prefixSymbol = <span className="text-xs mr-1 shrink-0">✓</span>;
        break;
      case 'archived':
        styleClass =
          'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border-dashed border-[var(--color-border)]';
        prefixSymbol = <span className="text-[10px] mr-1 shrink-0">⚑</span>;
        break;
    }
  } else if (priority) {
    switch (priority) {
      case 'critical':
        styleClass =
          'bg-[var(--color-danger)] text-white border-transparent font-bold tracking-wider uppercase';
        break;
      case 'high':
        styleClass =
          'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger)]/20 font-medium';
        break;
      case 'medium':
        styleClass =
          'bg-[var(--color-brand-soft)] text-[var(--color-brand)] border-[var(--color-brand)]/20 font-medium';
        break;
      case 'low':
        styleClass =
          'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)]';
        break;
    }
  } else {
    switch (variant) {
      case 'accent':
      case 'coral':
        styleClass =
          'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]/20 font-medium';
        break;
      case 'brand':
      case 'status-active':
      case 'solid':
        styleClass =
          'bg-[var(--color-brand)] text-[var(--color-text-on-brand)] border-transparent font-medium';
        break;
      case 'tech':
      case 'tag':
        styleClass =
          'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)] font-mono text-[11px]';
        break;
      case 'outline':
        styleClass =
          'bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)]';
        break;
      case 'subtle':
      default:
        styleClass =
          'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)]';
        break;
    }
  }

  const sizes = {
    sm: 'text-[12px] px-2 py-0.5 rounded-[var(--radius-sm)]',
    md: 'text-[13px] px-2.5 py-1 rounded-[var(--radius-sm)]',
  };

  return (
    <span
      className={`inline-flex items-center border leading-tight select-none transition-colors ${sizes[size]} ${styleClass} ${className}`}
    >
      {prefixSymbol}
      {dot && !prefixSymbol && (
        <span className="w-1.5 h-1.5 rounded-full mr-1.5 inline-block shrink-0 bg-current opacity-70" />
      )}
      <span className="truncate">{children || status || priority}</span>
    </span>
  );
};

export default Badge;
