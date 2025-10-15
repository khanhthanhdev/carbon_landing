"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales } from "@/i18n/request";

export function LocaleSwitcher() {
  const activeLocale = useLocale();
  const pathname = usePathname();

  const normalizedPath = useMemo(() => {
    if (!pathname) return "/";

    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return "/";
    }

    if (locales.includes(segments[0] as (typeof locales)[number])) {
      const rest = segments.slice(1).join("/");
      return rest.length > 0 ? `/${rest}` : "/";
    }

    return pathname.startsWith("/") ? pathname : `/${pathname}`;
  }, [pathname]);

  return (
    <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-1 py-0.5 text-xs font-medium shadow-sm sm:text-sm">
      {locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <Link
            key={locale}
            href={`/${locale}${normalizedPath}`}
            className={`rounded-full px-2 py-1 transition-colors ${
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {locale.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
