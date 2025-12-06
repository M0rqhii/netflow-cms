"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@repo/ui';

interface SitePanelNavProps {
  slug: string;
}

const navItems = [
  { id: 'overview', label: 'Overview', href: '/panel/overview' },
  { id: 'page-builder', label: 'Page Builder', href: '/panel/page-builder' },
  { id: 'content', label: 'Content', href: '/panel/content' },
  { id: 'media', label: 'Media', href: '/panel/media' },
  { id: 'seo', label: 'SEO', href: '/panel/seo' },
];

export function SitePanelNav({ slug }: SitePanelNavProps) {
  const pathname = usePathname();
  const basePath = `/sites/${encodeURIComponent(slug)}/panel`;

  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-2 -mb-px">
        {navItems.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive = pathname === href || (item.id === 'overview' && pathname === basePath);

          return (
            <Link key={item.id} href={href}>
              <Button
                variant={isActive ? 'primary' : 'outline'}
                size="sm"
                className="rounded-b-none border-b-0"
                aria-pressed={isActive}
              >
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

