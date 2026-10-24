import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'mint';
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
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer';

  const variants = {
    primary: 'bg-[#14382B] hover:bg-[#1E503E] text-white shadow-sm hover:shadow focus:ring-[#14382B] active:scale-[0.98]',
    mint: 'bg-[#10B981] hover:bg-[#059669] text-white shadow-sm hover:shadow focus:ring-[#10B981] active:scale-[0.98]',
    secondary: 'bg-[#F0EAE1] hover:bg-[#E5DFD4] text-[#14382B] focus:ring-[#14382B] active:scale-[0.98]',
    outline: 'border border-[#CBD5E1] hover:border-[#94A3B8] bg-white text-[#1F2937] hover:bg-[#F8F5EE] focus:ring-[#14382B] active:scale-[0.98]',
    ghost: 'text-[#4B5563] hover:text-[#14382B] hover:bg-[#F0EAE1]/50 focus:ring-[#14382B]',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-600 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
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
      {!isLoading && icon && iconPosition === 'right' && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  );
};
