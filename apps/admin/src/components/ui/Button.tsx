"use client";

import React from 'react';
import clsx from 'clsx';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  asChild?: boolean;
  isLoading?: boolean;
};

export function Button({ variant = 'primary', className, isLoading, children, disabled, ...props }: ButtonProps) {
  const base = 'btn';
  const styles = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant];

  return (
    <button 
      className={clsx(base, styles, className)} 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
}

export default Button;

