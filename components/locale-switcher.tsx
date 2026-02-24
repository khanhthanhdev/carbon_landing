"use client";

import { useLocale } from "next-intl";
import { locales } from "@/i18n/request";
import { Link, usePathname } from "@/lib/navigation";

export function LocaleSwitcher() {
  const activeLocale = useLocale();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2 py-1 font-medium text-sm shadow-sm">
      {locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <Link
            className={`rounded-full px-2 py-1 transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            href={pathname}
            key={locale}
            locale={locale}
          >
            {locale.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
