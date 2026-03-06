import type { Metadata } from 'next';
import '../globals.css';
import React from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { IntlProvider } from '@/components/i18n/IntlProvider';
import { routing } from '../../i18n/routing';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Login - Net-Flow',
  description: 'Login to Net-Flow Admin Panel',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = routing.defaultLocale;

  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Inline theme init to avoid FOUC between SSR and client */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var key = 'nf-theme';
                  var saved = localStorage.getItem(key);
                  var theme = saved || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                  document.documentElement.classList.toggle('dark', theme === 'dark');
                } catch (e) {}
              })();
            `,
          }}
        />
        <IntlProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </IntlProvider>
      </body>
    </html>
  );
}





