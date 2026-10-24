import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-charcoal-light"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-light/60 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-charcoal
              placeholder:text-charcoal-light/50
              transition-colors duration-150
              focus:outline-none focus:ring-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-10' : ''}
              ${
                error
                  ? 'border-rose focus:border-rose focus:ring-rose/20'
                  : 'border-gray-green-border focus:border-mint focus:ring-mint/20'
              }
              ${className}
            `}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-rose">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-xs text-charcoal-light/70">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
