import React from 'react';

export interface ProgressBarProps {
  value?: number;
  progress?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
  colorByValue?: boolean;
  variant?: 'mint' | 'forest' | 'amber' | 'blue';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  progress,
  size = 'sm',
  showLabel = false,
  label,
  className = '',
  colorByValue = false,
  variant = 'mint',
}) => {
  const currentVal = value !== undefined ? value : progress !== undefined ? progress : 0;
  const clamped = Math.min(100, Math.max(0, currentVal));

  const heights = {
    xs: 'h-1.5',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  let fillColor = 'bg-emerald-500';
  if (colorByValue) {
    if (clamped >= 70) fillColor = 'bg-[#14382B]'; // forest
    else if (clamped >= 30) fillColor = 'bg-emerald-500'; // mint
    else fillColor = 'bg-amber-500'; // amber
  } else {
    const fillColors = {
      mint: 'bg-emerald-500',
      forest: 'bg-[#14382B]',
      amber: 'bg-amber-500',
      blue: 'bg-sky-500',
    };
    fillColor = fillColors[variant] || 'bg-emerald-500';
  }

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-xs text-stone-600 mb-1">
          <span>{label || 'Growth Progress'}</span>
          <span className="font-semibold text-stone-800">{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-stone-100 rounded-full overflow-hidden border border-stone-200/60 ${heights[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${fillColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
