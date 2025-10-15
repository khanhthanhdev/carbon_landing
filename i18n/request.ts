import { getRequestConfig } from 'next-intl/server';
import en from '../messages/en.json';
import vi from '../messages/vi.json';

// Can be imported from a shared config
export const locales = ['en', 'vi'] as const;
export type Locale = (typeof locales)[number];

const messages = {
  en,
  vi,
};

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    // During build time, return default locale messages for invalid locales
    return {
      locale: 'vi',
      messages: messages.vi
    };
  }

  return {
    locale: locale as Locale,
    messages: messages[locale as Locale]
  };
});