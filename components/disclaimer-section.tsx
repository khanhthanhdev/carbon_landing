"use client";

import { useTranslations } from "next-intl";

export function DisclaimerSection() {
  const t = useTranslations("disclaimer");
  const paragraphs = (t.raw("paragraphs") as string[] | undefined) ?? [];
  const [introParagraph, ...detailParagraphs] = paragraphs;
  const _label = t("label");
  const lead = t("lead");
  const _tagLabel = t("tag");

  return (
    <section
      aria-labelledby="disclaimer-heading"
      className="border-emerald-200 border-t py-12 sm:py-16"
    >
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-emerald-200/60 p-6">
          <div className="flex items-start gap-4">
            <div>
              <h2
                className="mt-2 font-semibold text-3xl text-slate-900 leading-tight sm:text-4xl"
                id="disclaimer-heading"
              >
                {t("title")}
              </h2>
            </div>
          </div>
          <p className="mt-6 text-base text-slate-700 leading-relaxed sm:text-lg">
            {lead}
          </p>
          {[introParagraph, ...detailParagraphs].map((paragraph, index) =>
            paragraph ? (
              <p
                className="mt-4 text-slate-800 text-sm leading-relaxed"
                key={`${index}-${paragraph.slice(0, 32)}`}
              >
                {paragraph}
              </p>
            ) : null
          )}
        </div>
      </div>
    </section>
  );
}
