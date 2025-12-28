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
  className, 
  isLoading, 
  children, 
  disabled, 
  'aria-label': ariaLabel,
  ...props 
}: ButtonProps) {
  const base = 'btn';
  const styles = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant];

  // If button has no accessible name and only contains icon/visual content, add aria-label
  const hasAccessibleName = ariaLabel || (typeof children === 'string' && children.trim()) || props.title;
  const finalAriaLabel = hasAccessibleName ? ariaLabel : undefined;

  return (
    <button 
      className={clsx(base, styles, className)} 
      disabled={disabled || isLoading}
      aria-label={finalAriaLabel}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="sr-only">Loading</span>
          <span aria-hidden="true">Loading...</span>
        </>
      ) : children}
    </button>
  );
}

export default Button;

