"use client";

import React from 'react';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardContent } from '@repo/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@repo/ui';
import { EmptyState } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';

export default function ContentPage() {
  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Content"
          description="Manage pages and content for your site. Page Builder coming soon."
          action={{
            label: "Create new page",
            disabled: true,
          }}
        />

        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <EmptyState
                        title="No pages yet"
                        description="Page Builder coming soon. You'll be able to create, edit, and manage pages here."
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for future content types */}
        <Card>
          <CardHeader>
            <CardTitle>Content Types</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted mb-4">
              Collections and custom content types will be available here.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
                <p className="text-sm text-muted">Coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SitePanelLayout>
  );
}

