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
    <div>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium mb-1"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      <input 
        {...props} 
        id={inputId}
        className={clsx('border rounded w-full p-2', error ? 'border-red-500' : '', className)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        aria-required={props.required ? 'true' : undefined}
      />
      {error && (
        <p id={errorId} className="text-xs text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
      {(hint || helperText) && !error && (
        <p id={hintId} className="text-xs text-muted mt-1">
          {hint || helperText}
        </p>
      )}
    </div>
  );
}
