import React from 'react';
import { cn } from '../utils/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className={cn('inline-flex items-center gap-2 cursor-pointer select-none', className)}>
        <input ref={ref} type="checkbox" className="sr-only peer" {...props} />
        <span className="h-4 w-4 rounded-[6px] border border-border bg-surface-2 flex items-center justify-center transition-all peer-checked:border-transparent peer-checked:gradient-primary">
          <span className="h-2 w-2 rounded-[4px] bg-white opacity-0 peer-checked:opacity-100" />
        </span>
        {label && <span className="text-sm text-text">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

