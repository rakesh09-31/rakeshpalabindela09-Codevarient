import React from 'react';

export interface ProgressBarProps {
  value?: number;
  progress?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
  colorByValue?: boolean;
  variant?: 'brand' | 'accent' | 'indigo' | 'coral' | 'mint' | 'forest' | 'amber' | 'blue' | 'monochrome';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  progress,
  size = 'xs',
  showLabel = false,
  label,
  className = '',
  variant = 'brand',
}) => {
  const currentVal = value !== undefined ? value : progress !== undefined ? progress : 0;
  const clamped = Math.min(100, Math.max(0, currentVal));

  const heights = {
    xs: 'h-[5px]',
    sm: 'h-[6px]',
    md: 'h-[8px]',
    lg: 'h-[10px]',
  };

  const isAccent = variant === 'accent' || variant === 'coral';
  const fillColor = isAccent
    ? 'bg-gradient-to-r from-[#C026D3] to-[#E879F9] shadow-[0_0_8px_rgba(192,38,211,0.5)]'
    : 'bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] shadow-[0_0_8px_rgba(139,47,232,0.4)]';

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-xs text-[var(--color-text-secondary)] mb-1.5 font-medium">
          <span>{label || 'Progress'}</span>
          <span className="font-mono text-[var(--color-text)] font-semibold">{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-[var(--color-surface-subtle)] rounded-[var(--radius-pill)] overflow-hidden border border-[var(--color-border)]/60 ${heights[size]}`}>
        <div
          className={`h-full rounded-[var(--radius-pill)] transition-all duration-300 ease-out ${fillColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
