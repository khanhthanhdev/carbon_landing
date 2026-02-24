"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

export function DisclaimerSection() {
  const t = useTranslations("disclaimer");

  const paragraphs: string[] = t.raw("paragraphs") as string[];

  return (
    <section
      aria-labelledby="disclaimer-heading"
      className="border-amber-200 border-t bg-amber-50 py-12 sm:py-16"
    >
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-100">
            <ShieldAlert
              aria-hidden="true"
              className="h-5 w-5 text-amber-700"
            />
          </div>
          <h2
            className="font-bold text-amber-900 text-xl sm:text-2xl"
            id="disclaimer-heading"
          >
            {t("title")}
          </h2>
        </div>

        {/* Divider */}
        <div className="mb-6 border-amber-200 border-t" />

        {/* Body paragraphs */}
        <div className="space-y-4">
          {paragraphs.map((paragraph, index) => (
            <p
              className="text-amber-800 text-sm leading-relaxed sm:text-base"
              key={index}
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
