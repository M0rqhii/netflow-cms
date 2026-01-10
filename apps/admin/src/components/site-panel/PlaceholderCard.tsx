"use client";

import React from 'react';
import { Card, CardContent } from '@repo/ui';
import { Skeleton } from '@repo/ui';

interface PlaceholderCardProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PlaceholderCard({ title, children, className }: PlaceholderCardProps) {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        {title && (
          <div className="mb-4">
            <Skeleton variant="text" width={120} height={20} />
          </div>
        )}
        {children || (
          <div className="space-y-2">
            <Skeleton variant="text" width="100%" height={16} />
            <Skeleton variant="text" width="80%" height={16} />
            <Skeleton variant="text" width="60%" height={16} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}









