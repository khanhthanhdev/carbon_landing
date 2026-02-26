"use client";

import { ArrowRight, BookOpen } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";

const StatsSection = memo(function StatsSection({
  t,
}: {
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0 divide-x divide-slate-200">
      <div className="px-8 py-4 text-center sm:px-10">
        <data
          className="mb-1 block font-bold text-3xl text-emerald-700 sm:text-4xl"
          value="50"
        >
          50+
        </data>
        <div className="text-slate-500 text-sm">{t("stats.questions")}</div>
      </div>
      <div className="px-8 py-4 text-center sm:px-10">
        <data
          className="mb-1 block font-bold text-3xl text-emerald-700 sm:text-4xl"
          value="6"
        >
          6
        </data>
        <div className="text-slate-500 text-sm">{t("stats.categories")}</div>
      </div>
      <div className="px-8 py-4 text-center sm:px-10">
        <div className="mb-1 font-bold text-3xl text-emerald-700 sm:text-4xl">
          AI
        </div>
        <div className="text-slate-500 text-sm">{t("stats.support")}</div>
      </div>
    </div>
  );
});

export const Hero = memo(function Hero() {
  const t = useTranslations("hero");

  return (
    <section
      aria-label="Hero"
      className="relative flex min-h-screen items-center overflow-hidden bg-linear-to-br from-slate-50 via-white to-emerald-50/40 pt-16"
    >
      {/* Subtle background shapes */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 60% at 80% 50%, oklch(0.92 0.08 155 / 0.5) 0%, transparent 65%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 50% 40% at 10% 80%, oklch(0.88 0.06 210 / 0.4) 0%, transparent 60%)",
        }}
      />

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #64748b 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="container relative z-10 mx-auto px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Text content */}
          <div className="flex flex-col">
            {/* Badge */}
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5">
              <span className="font-semibold text-emerald-700 text-xs uppercase tracking-widest">
                {t("badge")}
              </span>
            </div>

            <h1 className="mb-6 font-bold text-4xl text-slate-900 leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {t("title")}
            </h1>

            <p className="mb-10 max-w-xl text-lg text-slate-600 leading-relaxed">
              {t("description")}
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/#book">
                <Button
                  className="group w-full rounded-lg bg-emerald-600 px-7 py-6 font-semibold text-base text-white shadow-emerald-200 shadow-md hover:bg-emerald-700 sm:w-auto"
                  size="lg"
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  {t("readBook")}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link data-tour="books-cta" href="/books">
                <Button
                  className="w-full rounded-lg border-2 border-slate-300 bg-white px-7 py-6 text-base text-slate-700 hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
                  size="lg"
                  variant="outline"
                >
                  {t("browseQuestions")}
                </Button>
              </Link>
              <Link data-tour="ask-ai-cta" href="/ask-ai">
                <Button
                  className="w-full rounded-lg border-2 border-emerald-200 bg-emerald-50 px-7 py-6 text-base text-emerald-700 hover:bg-emerald-100 sm:w-auto"
                  size="lg"
                  variant="outline"
                >
                  {t("askAI")}
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 border-slate-200 border-t pt-8">
              <section aria-label="Platform statistics">
                <StatsSection t={t} />
              </section>
            </div>
          </div>

          {/* Right: Book image */}
          <div className="flex items-center justify-center lg:justify-end">
            <div className="relative">
              {/* Decorative glow behind book */}
              <div className="absolute inset-0 -m-8 rounded-3xl bg-emerald-100/60 blur-2xl" />
              <div className="relative rounded-2xl p-4">
                <Image
                  alt="Carbon Markets Q&A Handbook"
                  className="w-full max-w-xs drop-shadow-2xl sm:max-w-sm lg:max-w-md"
                  height={600}
                  priority
                  src="/book_cover.png"
                  width={450}
                />
              </div>
              {/* Floating accent badge */}
              <div className="absolute -bottom-4 -left-4 rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-lg shadow-slate-200/60">
                <div className="font-bold text-emerald-700 text-sm">
                  Q&amp;A Handbook
                </div>
                <div className="text-slate-500 text-xs">Carbon Markets</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
