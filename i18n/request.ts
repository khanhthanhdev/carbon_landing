import { getRequestConfig } from "next-intl/server";
import en from "../messages/en.json";
import vi from "../messages/vi.json";

// Can be imported from a shared config
export const locales = ["en", "vi"] as const;
export type Locale = (typeof locales)[number];

const messages = {
  en,
  vi,
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = locales.includes(requested as Locale)
    ? (requested as Locale)
    : "vi";

  return {
    locale,
    messages: messages[locale],
  };
});
