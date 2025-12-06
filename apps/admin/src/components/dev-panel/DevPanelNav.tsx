"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@repo/ui';

interface DevPanelNavProps {}

const navItems = [
  { id: 'overview', label: 'Overview', href: '/dev', icon: '📊' },
  { id: 'logs', label: 'Logs', href: '/dev/logs', icon: '📝' },
  { id: 'emails', label: 'Emails', href: '/dev/emails', icon: '✉️' },
  { id: 'payments', label: 'Payments', href: '/dev/payments', icon: '💳' },
  { id: 'sites', label: 'Sites', href: '/dev/sites', icon: '🌐' },
];

export function DevPanelNav({}: DevPanelNavProps) {
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-200 bg-white">
      <nav className="flex gap-1 -mb-px px-1 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.id === 'overview' && pathname === '/dev');

          return (
            <Link key={item.id} href={item.href} className="flex-shrink-0">
              <Button
                variant={isActive ? 'primary' : 'outline'}
                size="sm"
                className="rounded-b-none border-b-0 flex items-center gap-2 transition-colors"
                aria-pressed={isActive}
              >
                <span className="text-base">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

