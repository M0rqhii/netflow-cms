import React from 'react';
import { cn } from '../utils/cn';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  gradientRing?: boolean;
  fallback?: string;
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, size = 'md', gradientRing = false, fallback, ...props }, ref) => {
    const sizes = {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
      xl: 'h-16 w-16 text-lg',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full bg-surface-2 text-text overflow-hidden',
          gradientRing && 'p-[2px] gradient-primary',
          sizes[size],
          className
        )}
        {...props}
      >
        <div className={cn('rounded-full w-full h-full overflow-hidden flex items-center justify-center', gradientRing && 'bg-surface')}>
          {src ? (
            <img src={src} alt={alt || 'Avatar'} className="w-full h-full object-cover" />
          ) : (
            <span className="font-semibold">{fallback || (alt ? alt.slice(0, 2).toUpperCase() : '?')}</span>
          )}
        </div>
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

