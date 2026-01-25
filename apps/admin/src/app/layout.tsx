import './globals.css';
import LayoutWrapper from './LayoutWrapper';
import { IntlProvider } from '../components/i18n/IntlProvider';
import { routing } from '../i18n/routing';
import Script from 'next/script';

export const metadata = {
  title: 'Netflow CMS - Admin Panel',
  description: 'Multi-Site Headless CMS Admin Panel',
  icons: {
    icon: '/assets/Net-Flow-Logo-Symbol.png',
    shortcut: '/assets/Net-Flow-Logo-Symbol.png',
    apple: '/assets/Net-Flow-Logo-Symbol.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use default locale for SSR
  const locale = routing.defaultLocale;

  return (
    <html lang={locale} suppressHydrationWarning>
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
                  var theme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                  document.documentElement.classList.toggle('dark', theme === 'dark');
                } catch (e) {}
              })();
            `,
          }}
        />
        <IntlProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </IntlProvider>
      </body>
    </html>
  );
}

