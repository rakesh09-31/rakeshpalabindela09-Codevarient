import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, rows = 4, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-charcoal-light"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`
            w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-charcoal
            placeholder:text-charcoal-light/50
            transition-colors duration-150
            focus:outline-none focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed
            resize-y
            ${
              error
                ? 'border-rose focus:border-rose focus:ring-rose/20'
                : 'border-gray-green-border focus:border-mint focus:ring-mint/20'
            }
            ${className}
          `}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="text-xs text-rose">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${textareaId}-hint`} className="text-xs text-charcoal-light/70">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
