"use client";

import { ArrowRight, BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";

// Memoized stats section to prevent unnecessary re-renders
const StatsSection = memo(function StatsSection({
  t,
}: {
  t: (key: string) => string;
}) {
  return (
    <section
      aria-label="Platform statistics"
      className="flex items-center justify-center gap-8 border-border/50 border-t pt-8 sm:gap-16"
    >
      <div className="text-center">
        <data
          className="mb-1 block font-bold text-3xl text-foreground sm:text-4xl"
          value="50"
        >
          50+
        </data>
        <div className="text-muted-foreground text-sm">
          {t("stats.questions")}
        </div>
      </div>
      <div aria-hidden="true" className="h-12 w-px bg-border/50" />
      <div className="text-center">
        <data
          className="mb-1 block font-bold text-3xl text-foreground sm:text-4xl"
          value="6"
        >
          6
        </data>
        <div className="text-muted-foreground text-sm">
          {t("stats.categories")}
        </div>
      </div>
      <div aria-hidden="true" className="h-12 w-px bg-border/50" />
      <div className="text-center">
        <div className="mb-1 font-bold text-3xl text-foreground sm:text-4xl">
          AI
        </div>
        <div className="text-muted-foreground text-sm">
          {t("stats.support")}
        </div>
      </div>
    </section>
  );
});

export const Hero = memo(function Hero() {
  const t = useTranslations("hero");
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem("hasVisited");
    if (!hasVisited) {
      setIsUserGuideOpen(true);
      localStorage.setItem("hasVisited", "true");
    }
  }, []);

  return (
    <section className="relative flex min-h-screen items-center justify-center pt-16">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />

      <div className="container relative z-10 mx-auto px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div
            aria-label="Site announcement"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-2 font-medium text-foreground text-sm"
            role="banner"
          >
            {t("badge")}
          </div>

          <h1 className="mb-6 font-bold text-4xl text-foreground leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            {t("title")}
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground leading-relaxed sm:text-xl">
            {t("description")}
          </p>

          <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link className="w-full sm:max-w-[240px] sm:flex-1" href="/#book">
              <Button
                className="group w-full bg-primary px-8 py-6 text-base text-primary-foreground hover:bg-primary/90"
                size="lg"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                {t("readBook")}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link
              className="w-full sm:max-w-[240px] sm:flex-1"
              data-tour="books-cta"
              href="/books"
            >
              <Button
                className="w-full border-2 bg-transparent px-8 py-6 text-base"
                size="lg"
                variant="outline"
              >
                {t("browseQuestions")}
              </Button>
            </Link>
            <Link
              className="w-full sm:max-w-[240px] sm:flex-1"
              data-tour="ask-ai-cta"
              href="/ask-ai"
            >
              <Button
                className="w-full bg-secondary px-8 py-6 text-base text-secondary-foreground"
                size="lg"
              >
                {t("askAI")}
              </Button>
            </Link>
          </div>

          <StatsSection t={t} />
        </div>
      </div>
    </section>
  );
});
