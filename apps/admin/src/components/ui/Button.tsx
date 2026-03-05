"use client";

import React from 'react';
import clsx from 'clsx';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  asChild?: boolean;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  isLoading,
  children,
  disabled,
  'aria-label': ariaLabel,
  ...props
}: ButtonProps) {
  const base = 'btn';
  const variants = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant];

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: '',
    lg: 'h-10 px-5 text-sm gap-2',
  }[size];

  const hasAccessibleName = ariaLabel || (typeof children === 'string' && children.trim()) || props.title;
  const finalAriaLabel = hasAccessibleName ? ariaLabel : undefined;

  return (
    <button
      className={clsx(base, variants, sizes, className)}
      disabled={disabled || isLoading}
      aria-label={finalAriaLabel}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="sr-only">Loading</span>
          <span>{children}</span>
        </>
      ) : children}
    </button>
  );
}

export default Button;
