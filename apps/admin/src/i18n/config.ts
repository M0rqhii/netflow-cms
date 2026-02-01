import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale: _requestLocale }) => {
  // Get locale from request or use default
  // Since we're not using locale in URL, always use default
  // Language is managed client-side via IntlProvider
  const locale = routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: 'UTC',
  };
});

