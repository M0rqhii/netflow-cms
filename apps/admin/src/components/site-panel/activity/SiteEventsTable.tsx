"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, EmptyState } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';

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
  if (!events.length) {
    return (
      <EmptyState
        title={loading ? 'Loading events...' : 'No activity yet'}
        description="Site activity will appear here as editors create pages, upload media, and manage SEO."
        className="border border-dashed"
      />
    );
  }

  return (
    <div className="overflow-hidden border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
            const when = event.createdAt ? new Date(event.createdAt).toLocaleString() : '';
            return (
              <TableRow 
                key={event.id}
                className={onEventClick ? 'cursor-pointer hover:bg-gray-50' : ''}
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
