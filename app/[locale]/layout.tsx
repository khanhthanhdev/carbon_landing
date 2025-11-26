import type React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import "../globals.css";
import { locales } from "@/i18n/request";
import { Providers } from "@/app/providers";
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
      lang={resolvedLocale}
      className="scroll-smooth"
      suppressHydrationWarning
    >
      <head>
        <style>
          @import
          url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;700&display=swap');
        </style>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#000000" />
        <meta name="color-scheme" content="light dark" />
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />

        {/* Canonical and hreflang links */}
        <link rel="canonical" href={alternateLinks.canonical} />
        {alternateLinks.hreflang.map((link) => (
          <link key={link.href} rel="alternate" hrefLang={link.hrefLang} href={link.href} />
        ))}

        {/* Favicon and Icons */}
        <link rel="icon" href="/logo_carbon.jpg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo_carbon.jpg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />

        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />

        {/* Preload critical resources */}
        <link
          rel="preload"
          href="/logo_carbon.jpg"
          as="image"
          type="image/jpeg"
        />

        {/* Open Graph and Twitter meta tags for fallback */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="CarbonLearn" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@carbonlearn" />
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
