import React from 'react';
import { cn } from '../utils/cn';

export interface ToggleSwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const ToggleSwitch = React.forwardRef<HTMLInputElement, ToggleSwitchProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className={cn('inline-flex items-center gap-2 cursor-pointer select-none', className)}>
        <input ref={ref} type="checkbox" className="sr-only peer" {...props} />
        <span className="relative h-5 w-9 rounded-full border border-border bg-surface-2 transition-all peer-checked:border-transparent peer-checked:gradient-primary">
          <span className="absolute top-[2px] left-[2px] h-3.5 w-3.5 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
        </span>
        {label && <span className="text-sm text-text">{label}</span>}
      </label>
    );
  }
);

ToggleSwitch.displayName = 'ToggleSwitch';

