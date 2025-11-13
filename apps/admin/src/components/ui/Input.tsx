import React from 'react';
import clsx from 'clsx';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string };

export function TextInput({ label, hint, error, className, ...props }: InputProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <input {...props} className={clsx('border rounded w-full p-2', error ? 'border-red-500' : '', className)} />
      {error ? (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      ) : (
        hint ? <p className="text-xs text-muted mt-1">{hint}</p> : null
      )}
    </div>
  );
}
