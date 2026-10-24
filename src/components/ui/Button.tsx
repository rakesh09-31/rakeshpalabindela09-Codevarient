import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'mint' | 'coral' | 'revival' | 'gradient' | 'fusion';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const isSpinning = isLoading || loading;
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none select-none cursor-pointer tracking-tight';

  const variants = {
    primary:
      'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] shadow-[0_0_14px_rgba(139,47,232,0.3)] active:scale-[0.98]',
    gradient:
      'bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] text-white hover:from-[#9D47F4] hover:to-[#D946EF] shadow-[0_0_20px_rgba(192,38,211,0.4)] border border-white/20 active:scale-[0.98]',
    fusion:
      'bg-gradient-to-r from-[#8B2FE8] via-[#A838E8] to-[#C026D3] text-white hover:from-[#9D47F4] hover:to-[#D946EF] shadow-[0_0_24px_rgba(192,38,211,0.45)] border border-white/20 active:scale-[0.98]',
    mint:
      'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] shadow-[0_0_14px_rgba(139,47,232,0.3)] active:scale-[0.98]',
    accent:
      'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-[0_0_16px_rgba(192,38,211,0.35)] active:scale-[0.98]',
    coral:
      'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-[0_0_16px_rgba(192,38,211,0.35)] active:scale-[0.98]',
    revival:
      'bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] text-white hover:from-[#9D47F4] hover:to-[#D946EF] shadow-[0_0_18px_rgba(192,38,211,0.35)] border border-white/15 active:scale-[0.98]',
    secondary:
      'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)] active:scale-[0.98]',
    outline:
      'border border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)] active:scale-[0.98]',
    ghost:
      'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]',
    danger:
      'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border border-[var(--color-danger)]/30 hover:bg-[var(--color-danger)] hover:text-white active:scale-[0.98]',
  };

  const sizes = {
    sm: 'h-[34px] text-xs px-3 gap-1.5 rounded-[var(--radius-sm)]',
    md: 'h-[42px] text-sm px-4 gap-2 rounded-[var(--radius-md)]',
    lg: 'h-[46px] text-base px-5 gap-2.5 rounded-[var(--radius-md)]',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isSpinning}
      {...props}
    >
      {isSpinning ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      ) : (
        icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!isSpinning && icon && iconPosition === 'right' && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  );
};

export default Button;
