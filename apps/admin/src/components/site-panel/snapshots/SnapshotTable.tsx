"use client";

import React from 'react';
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, EmptyState } from '@repo/ui';

export type SnapshotRow = {
  id: string;
  label: string;
  createdAt: string;
};

interface SnapshotTableProps {
  snapshots: SnapshotRow[];
  loading?: boolean;
  restoringId?: string | null;
  onRestore: (snapshotId: string) => void;
}

export function SnapshotTable({ snapshots, loading, restoringId, onRestore }: SnapshotTableProps) {
  if (!snapshots.length) {
    return (
      <EmptyState
        title="No snapshots yet"
        description="Create a snapshot to capture pages and SEO settings for this site."
        className="border border-dashed"
      />
    );
  }

  return (
    <div className="overflow-hidden border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-2/5">Label</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {snapshots.map((snapshot) => {
            const formattedDate = snapshot.createdAt
              ? new Date(snapshot.createdAt).toLocaleString()
              : '';
            return (
              <TableRow key={snapshot.id}>
                <TableCell className="font-medium">{snapshot.label}</TableCell>
                <TableCell className="text-sm text-muted">{formattedDate}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading || restoringId === snapshot.id}
                    onClick={() => onRestore(snapshot.id)}
                  >
                    {restoringId === snapshot.id ? 'Restoring...' : 'Restore'}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
