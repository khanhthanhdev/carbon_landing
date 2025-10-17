"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/lib/navigation";
import { locales } from "@/i18n/request";

export function LocaleSwitcher() {
  const activeLocale = useLocale();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2 py-1 text-sm font-medium shadow-sm">
      {locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
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
