import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type React from "react";
import { Suspense } from "react";
import "../globals.css";
import { Providers } from "@/app/providers";
import { locales } from "@/i18n/request";
import { buildPageMetadata, getAlternateLinksForLayout } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildPageMetadata("home", locale);
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const resolvedLocale = locales.includes(locale as (typeof locales)[number])
    ? locale
    : "vi";

  setRequestLocale(resolvedLocale);
  const messages = await getMessages({ locale: resolvedLocale });

  const alternateLinks = getAlternateLinksForLayout("", resolvedLocale);

  return (
    <html
      className="scroll-smooth"
      lang={resolvedLocale}
      suppressHydrationWarning
    >
      <head>
        <style>
          @import
          url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;700&display=swap');
        </style>
        <meta
          content="width=device-width, initial-scale=1, maximum-scale=5"
          name="viewport"
        />
        <meta content="telephone=no" name="format-detection" />
        <meta content="#000000" name="theme-color" />
        <meta content="light dark" name="color-scheme" />
        <meta
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
          name="robots"
        />

        {/* Canonical and hreflang links */}
        <link href={alternateLinks.canonical} rel="canonical" />
        {alternateLinks.hreflang.map((link) => (
          <link
            href={link.href}
            hrefLang={link.hrefLang}
            key={link.href}
            rel="alternate"
          />
        ))}

        {/* Favicon and Icons */}
        <link href="/logo_carbon.jpg" rel="icon" />
        <link href="/logo_carbon.jpg" rel="apple-touch-icon" sizes="180x180" />
        <link href="/favicon.ico" rel="icon" type="image/x-icon" />
        <link href="/manifest.json" rel="manifest" />

        {/* Preconnect to external domains for performance */}
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link
          crossOrigin="anonymous"
          href="https://fonts.gstatic.com"
          rel="preconnect"
        />
        <link href="//www.google-analytics.com" rel="dns-prefetch" />
        <link href="//www.googletagmanager.com" rel="dns-prefetch" />

        {/* Preload critical resources */}
        <link
          as="image"
          href="/logo_carbon.jpg"
          rel="preload"
          type="image/jpeg"
        />

        {/* Open Graph and Twitter meta tags for fallback */}
        <meta content="website" property="og:type" />
        <meta content="CarbonLearn" property="og:site_name" />
        <meta content="summary_large_image" name="twitter:card" />
        <meta content="@carbonlearn" name="twitter:site" />
      </head>
      <body className="font-sans">
        <ClerkProvider>
          <NextIntlClientProvider locale={resolvedLocale} messages={messages}>
            <Providers>
              <Suspense fallback={null}>{children}</Suspense>
            </Providers>
          </NextIntlClientProvider>
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  );
}
