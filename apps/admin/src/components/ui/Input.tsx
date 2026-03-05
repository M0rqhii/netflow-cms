import React from 'react';
import clsx from 'clsx';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  helperText?: string;
};

export function TextInput({ label, hint, error, helperText, className, id, ...props }: InputProps) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = (hint || helperText) ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-foreground"
        >
          {label}
          {props.required && <span className="text-red-500 ml-0.5" aria-label="required">*</span>}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        className={clsx(
          'flex h-9 w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground',
          'placeholder:text-muted',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-150',
          error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-border',
          className
        )}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        aria-required={props.required ? 'true' : undefined}
      />
      {error && (
        <p id={errorId} className="text-xs text-red-500 flex items-center gap-1" role="alert">
          <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
          </svg>
          {error}
        </p>
      )}
      {(hint || helperText) && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint || helperText}
        </p>
      )}
    </div>
  );
}

export const Input = TextInput;
export default TextInput;
