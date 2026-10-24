import React from 'react';
import { ProjectStatus, Priority, ProjectVisibility } from '../../types';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?:
    | 'default'
    | 'mint'
    | 'forest'
    | 'amber'
    | 'rose'
    | 'lavender'
    | 'paleblue'
    | 'gray'
    | 'tech'
    | 'tag'
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
  let styleClass = 'bg-stone-100 text-stone-700 border-stone-200';
  let dotClass = 'bg-stone-400';

  if (status) {
    switch (status) {
      case 'active':
        styleClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        dotClass = 'bg-emerald-500';
        break;
      case 'paused':
        styleClass = 'bg-amber-50 text-amber-800 border-amber-200';
        dotClass = 'bg-amber-500';
        break;
      case 'abandoned':
        styleClass = 'bg-rose-50 text-rose-700 border-rose-200';
        dotClass = 'bg-rose-400';
        break;
      case 'revived':
        styleClass = 'bg-teal-50 text-teal-800 border-teal-200';
        dotClass = 'bg-teal-500';
        break;
      case 'completed':
        styleClass = 'bg-[#14382B]/10 text-[#14382B] border-[#14382B]/30';
        dotClass = 'bg-[#14382B]';
        break;
      case 'archived':
        styleClass = 'bg-stone-100 text-stone-600 border-stone-300';
        dotClass = 'bg-stone-400';
        break;
    }
  } else if (priority) {
    switch (priority) {
      case 'critical':
        styleClass = 'bg-rose-600 text-white border-rose-600';
        break;
      case 'high':
        styleClass = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
      case 'medium':
        styleClass = 'bg-amber-50 text-amber-800 border-amber-200';
        break;
      case 'low':
        styleClass = 'bg-stone-100 text-stone-600 border-stone-200';
        break;
    }
  } else {
    switch (variant) {
      case 'status-active':
      case 'mint':
        styleClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        dotClass = 'bg-emerald-500';
        break;
      case 'status-paused':
      case 'amber':
        styleClass = 'bg-amber-50 text-amber-800 border-amber-200';
        dotClass = 'bg-amber-500';
        break;
      case 'status-abandoned':
      case 'rose':
        styleClass = 'bg-rose-50 text-rose-700 border-rose-200';
        dotClass = 'bg-rose-400';
        break;
      case 'status-completed':
      case 'forest':
        styleClass = 'bg-[#14382B]/10 text-[#14382B] border-[#14382B]/30';
        dotClass = 'bg-[#14382B]';
        break;
      case 'status-archived':
      case 'gray':
        styleClass = 'bg-stone-100 text-stone-600 border-stone-200';
        dotClass = 'bg-stone-400';
        break;
      case 'status-revived':
      case 'lavender':
        styleClass = 'bg-purple-50 text-purple-800 border-purple-200';
        dotClass = 'bg-purple-500';
        break;
      case 'paleblue':
        styleClass = 'bg-sky-50 text-sky-800 border-sky-200';
        dotClass = 'bg-sky-500';
        break;
      case 'tech':
        styleClass = 'bg-[#FAF6EE] text-[#2D3436] border-[#E2E8DE]';
        break;
      case 'tag':
        styleClass = 'bg-sky-50 text-sky-800 border-sky-200';
        break;
      case 'priority-low':
        styleClass = 'bg-stone-100 text-stone-600 border-stone-200';
        break;
      case 'priority-medium':
        styleClass = 'bg-amber-50 text-amber-800 border-amber-200';
        break;
      case 'priority-high':
        styleClass = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
      case 'priority-critical':
        styleClass = 'bg-rose-600 text-white border-rose-600';
        break;
      default:
        styleClass = 'bg-stone-100 text-stone-700 border-stone-200';
        break;
    }
  }

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizes[size]} ${styleClass} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />}
      {children}
    </span>
  );
};

export default Badge;
