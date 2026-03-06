"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, EmptyState } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useTranslations } from '@/hooks/useTranslations';

export type SiteEventRow = {
  id: string;
  type: string;
  message: string;
  metadata?: unknown;
  createdAt: string;
};

interface SiteEventsTableProps {
  events: SiteEventRow[];
  loading?: boolean;
  onEventClick?: (event: SiteEventRow) => void;
}

export function SiteEventsTable({ events, loading, onEventClick }: SiteEventsTableProps) {
  const t = useTranslations();

  if (!events.length) {
    return (
      <EmptyState
        title={loading ? t('sitePanelShell.activityUi.table.loading') : t('sitePanelShell.activityUi.table.empty')}
        description={t('sitePanelShell.activityUi.table.emptyDescription')}
        className="border border-dashed border-border rounded-[18px]"
      />
    );
  }

  return (
    <div className="overflow-hidden border border-border rounded-[18px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('sitePanelShell.activityUi.table.when')}</TableHead>
            <TableHead>{t('sitePanelShell.activityUi.table.event')}</TableHead>
            <TableHead>{t('sitePanelShell.activityUi.table.message')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
            const when = event.createdAt ? new Date(event.createdAt).toLocaleString() : '';
            return (
              <TableRow 
                key={event.id}
                className={onEventClick ? 'cursor-pointer hover:bg-[var(--hover)]' : ''}
                onClick={() => onEventClick?.(event)}
              >
                <TableCell className="text-sm text-muted">{when}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge className="capitalize">{event.type.replace(/_/g, ' ')}</Badge>
                </TableCell>
                <TableCell className="text-sm">{event.message}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}


