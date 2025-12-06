"use client";

import React from 'react';
import { Card, CardContent } from '@repo/ui';

type Props = {
  title?: string;
  description?: string;
  imageUrl?: string;
  urlHint?: string;
};

export function SeoPreviewCard({ title, description, imageUrl, urlHint }: Props) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-xs text-muted">
                OG image placeholder
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted">{urlHint || 'yoursite.com/preview'}</p>
            <p className="text-base font-semibold leading-tight truncate">{title || 'Social title preview'}</p>
            <p className="text-sm text-muted leading-snug line-clamp-2">
              {description || 'Social description preview will appear here.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
