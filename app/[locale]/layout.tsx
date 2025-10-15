import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import "../globals.css";
import { locales } from "@/i18n/request";
import { Providers } from "@/app/providers";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CarbonLearn - Carbon Training for SMEs",
  description:
    "Comprehensive carbon trading and sustainability training programs designed specifically for SME companies",
  generator: "VinUni & British Council",
};

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
