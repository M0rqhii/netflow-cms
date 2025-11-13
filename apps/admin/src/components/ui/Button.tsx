"use client";

import React from 'react';
import clsx from 'clsx';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost';
  asChild?: boolean;
};

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const base = 'btn';
  const styles = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
  }[variant];

  return <button className={clsx(base, styles, className)} {...props} />;
}

export default Button;

