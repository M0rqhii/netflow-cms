"use client";

import React from 'react';
import clsx from 'clsx';

interface InfoIconProps {
  hint: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function InfoIcon({ hint, className, size = 'md' }: InfoIconProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center text-muted cursor-help',
        sizeClasses[size],
        className
      )}
      title={hint}
      aria-label="Information"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-full w-full"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="8" />
        <path d="M10 6v2M10 14h.01" strokeLinecap="round" />
      </svg>
    </span>
  );
}

