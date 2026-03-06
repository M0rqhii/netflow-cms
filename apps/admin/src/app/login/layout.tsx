import type { Metadata } from 'next';
import '../globals.css';
import React from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { IntlProvider } from '@/components/i18n/IntlProvider';
import { routing } from '../../i18n/routing';
import Script from 'next/script';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

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
    <html lang={locale} className={inter.variable} data-theme="dark" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {/* Inline theme init to avoid FOUC between SSR and client */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var language = localStorage.getItem('nf-language');
                  if (language === 'pl' || language === 'en') {
                    document.documentElement.lang = language;
                  }
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
