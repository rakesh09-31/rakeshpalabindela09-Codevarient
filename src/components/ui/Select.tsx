import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-charcoal-light"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`
              w-full appearance-none rounded-xl border bg-white
              px-3.5 py-2.5 pr-10 text-sm text-charcoal
              transition-colors duration-150
              focus:outline-none focus:ring-2
              disabled:opacity-50 disabled:cursor-not-allowed
              cursor-pointer
              ${
                error
                  ? 'border-rose focus:border-rose focus:ring-rose/20'
                  : 'border-gray-green-border focus:border-mint focus:ring-mint/20'
              }
              ${className}
            `}
            aria-invalid={error ? true : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-light/60 pointer-events-none"
          />
        </div>
        {error && (
          <p className="text-xs text-rose">{error}</p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
