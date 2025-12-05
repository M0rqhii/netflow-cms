"use client";

import React from 'react';
import Link from 'next/link';
import { useTranslations } from '@/hooks/useTranslations';

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
  icon?: React.ReactNode;
};

export default function EmptyState({
  title,
  message,
  actionLabel,
  actionHref,
  onActionClick,
  icon,
}: EmptyStateProps) {
  const actionButton = actionLabel && (actionHref || onActionClick) ? (
    actionHref ? (
      <Link href={actionHref} className="btn btn-primary mt-4 inline-block">
        {actionLabel}
      </Link>
    ) : (
      <button onClick={onActionClick} className="btn btn-primary mt-4">
        {actionLabel}
      </button>
    )
  ) : null;

  return (
    <div className="card">
      <div className="card-body text-center py-12">
        {icon && <div className="mb-4 flex justify-center">{icon}</div>}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted mb-4">{message}</p>
        {actionButton}
      </div>
    </div>
  );
}




