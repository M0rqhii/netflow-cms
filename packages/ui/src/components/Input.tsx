import React from 'react';
import { cn } from '../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : `input-${Math.random().toString(36).substr(2, 9)}`);
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = helperText ? `${inputId}-hint` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-muted mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'input text-sm',
            'placeholder:text-muted focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-60',
            error && 'border-red-500 ',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          aria-required={props.required ? 'true' : undefined}
          {...props}
        />
        {error && <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">{error}</p>}
        {helperText && !error && <p id={hintId} className="mt-1 text-sm text-muted">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';



