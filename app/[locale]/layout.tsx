import type React from "react";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import "../globals.css";
import { locales } from "@/i18n/request";
import { Providers } from "@/app/providers";
import { buildPageMetadata } from "@/lib/seo";


const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});

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
  const resolvedLocale = locales.includes(locale as (typeof locales)[number]) ? locale : "vi";

  setRequestLocale(resolvedLocale);
  const messages = await getMessages({ locale: resolvedLocale });

  return (
    <html lang={resolvedLocale} className="scroll-smooth" suppressHydrationWarning>
      <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="theme-color" content="#000000" />
      <meta name="color-scheme" content="light dark" />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

        {/* Favicon and Icons */}
        <link rel="icon" href="/logo_carbon.jpg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo_carbon.jpg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />

        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />

        {/* Preload critical resources */}
        <link rel="preload" href="/logo_carbon.jpg" as="image" type="image/jpeg" />

        {/* Open Graph and Twitter meta tags for fallback */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="CarbonLearn" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@carbonlearn" />
      </head>
      <body className={`font-sans ${inter.variable}`}>
        <NextIntlClientProvider locale={resolvedLocale} messages={messages}>
          <Providers>
            <Suspense fallback={null}>{children}</Suspense>
          </Providers>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
