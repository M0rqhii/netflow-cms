"use client";

import React from 'react';
import { Button } from '@repo/ui';

interface SectionHeaderProps {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  action?: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'outline';
  };
}

export function SectionHeader({ title, description, action, as = 'h2' }: SectionHeaderProps) {
  const HeadingTag = as;

  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <HeadingTag className="text-xl font-semibold">{title}</HeadingTag>
        {description && (
          <div className="text-sm text-muted mt-1">{description}</div>
        )}
      </div>
      {action && (
        <Button
          onClick={action.onClick}
          disabled={action.disabled}
          variant={action.variant || 'outline'}
          size="sm"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

