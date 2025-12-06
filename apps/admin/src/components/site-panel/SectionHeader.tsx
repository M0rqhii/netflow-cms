"use client";

import React from 'react';
import { Button } from '@repo/ui';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'outline';
  };
}

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted mt-1">{description}</p>
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

