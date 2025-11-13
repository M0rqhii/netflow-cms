import type { Metadata } from 'next';
import './globals.css';
import { Topbar } from '@/components/layout/Topbar';
import { Sidebar } from '@/components/layout/Sidebar';
import React from 'react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import CollapseToggle from '@/components/ui/CollapseToggle';
import UserBar from '@/components/layout/UserBar';
import { ToastProvider } from '@/components/ui/Toast';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Netflow CMS - Admin Panel',
  description: 'Multi-Tenant Headless CMS Admin Panel',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline theme init to avoid FOUC between SSR and client */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var key = 'nf-theme';
                  var saved = localStorage.getItem(key);
                  var theme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ToastProvider>
          <Topbar right={<div className="flex gap-2"><CollapseToggle /><ThemeToggle /><UserBar /></div>} />
          <div className="flex min-h-[calc(100vh-56px)]">
            <Sidebar />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}

