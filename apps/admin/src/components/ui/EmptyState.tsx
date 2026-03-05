"use client";

import React from 'react';
import Link from 'next/link';

type EmptyStateProps = {
  title: string;
  message?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
};

export default function EmptyState({
  title,
  message,
  description,
  actionLabel,
  actionHref,
  onActionClick,
  action,
  icon,
}: EmptyStateProps) {
  const displayMessage = message || description;
  const finalActionLabel = actionLabel || action?.label;
  const finalActionClick = onActionClick || action?.onClick;

  const actionButton = finalActionLabel && (actionHref || finalActionClick) ? (
    actionHref ? (
      <Link href={actionHref} className="btn btn-primary mt-5 inline-flex">
        {finalActionLabel}
      </Link>
    ) : (
      <button onClick={finalActionClick} className="btn btn-primary mt-5">
        {finalActionLabel}
      </button>
    )
  ) : null;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {icon ? (
        <div className="mb-4">{icon}</div>
      ) : (
        <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      {displayMessage && <p className="text-sm text-muted text-center max-w-sm">{displayMessage}</p>}
      {actionButton}
    </div>
  );
}
