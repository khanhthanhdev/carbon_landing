import { createNavigation } from "next-intl/navigation";

export const locales = ["en", "vi"] as const;
export type Locale = (typeof locales)[number];

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales,
});
