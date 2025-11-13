import React from 'react';
import clsx from 'clsx';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'default' | 'success' | 'warning' | 'error';
};

export function Badge({ tone = 'default', className, ...props }: BadgeProps) {
  const toneClass = {
    default: 'badge',
    success: 'badge text-emerald-700 bg-emerald-50 border-emerald-200',
    warning: 'badge text-amber-700 bg-amber-50 border-amber-200',
    error: 'badge text-red-700 bg-red-50 border-red-200',
  }[tone];

  return <span className={clsx(toneClass, className)} {...props} />;
}

export default Badge;

