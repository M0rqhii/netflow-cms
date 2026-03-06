import './globals.css';
import LayoutWrapper from './LayoutWrapper';
import { IntlProvider } from '../components/i18n/IntlProvider';
import { routing } from '../i18n/routing';
import Script from 'next/script';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'Net-Flow - Admin Panel',
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
  const locale = routing.defaultLocale;

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
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
