"use client";

import React, { useState, useRef, useCallback } from 'react';

interface TooltipProps {
  content?: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, side = 'top', className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), 200);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setIsVisible(false);
  }, []);

  if (!content) {
    return <>{children}</>;
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute ${positionClasses[side]} px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap z-50 pointer-events-none animate-fade-in bg-foreground text-background shadow-lg`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}
