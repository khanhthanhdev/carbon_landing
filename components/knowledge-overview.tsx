"use client";

import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import qaData from "@/data/qa_new.json";
import { Link } from "@/lib/navigation";

type QASection = (typeof qaData.sections)[number];

export const KnowledgeOverview = memo(function KnowledgeOverview() {
  const t = useTranslations("knowledgeOverview");
  const _locale = useLocale();

  // Memoize data processing for performance
  const sections: QASection[] = qaData.sections ?? [];
  const { totalQuestions, featuredSections } = useMemo(() => {
    const totalQuestions = sections.reduce(
      (count, section) => count + section.questions.length,
      0
    );
    const featuredSections = sections.slice(0, 6).map((section) => ({
      id: section.section_id,
      title: section.section_title,
      questionCount: section.question_count ?? section.questions.length,
      highlight: section.questions[0]?.question ?? "",
    }));

    return { totalQuestions, featuredSections };
  }, [sections]);

  return (
    <section className="bg-muted/30 py-16 sm:py-20 lg:py-28">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center sm:mb-16 lg:mb-20">
          {/* Left-border section label */}
          <div className="mb-6 flex justify-center">
            <div className="border-primary border-l-4 pl-3 text-left">
              <span className="font-semibold text-primary text-sm uppercase tracking-widest">
                {t("spotlight")}
              </span>
            </div>
          </div>
          <p className="mx-auto max-w-3xl text-pretty text-lg text-muted-foreground leading-relaxed sm:text-xl">
            {t("subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <span className="rounded-sm bg-primary/10 px-4 py-2 font-medium text-primary text-sm">
              {t("totalSections", { count: sections.length })}
            </span>
            <span className="rounded-sm border border-border px-4 py-2 font-medium text-muted-foreground text-sm">
              {t("totalQuestions", { count: totalQuestions })}
            </span>
          </div>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-6 sm:mb-16 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {featuredSections.map((section, index) => (
            <Card
              className="group relative h-full overflow-hidden rounded-sm border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md sm:p-8"
              key={section.id}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Animated left border on hover */}
              <div className="absolute top-0 left-0 h-0 w-1 bg-primary transition-all duration-300 group-hover:h-full" />

              <div className="relative z-10 flex h-full flex-col">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <h3 className="flex-1 font-bold text-foreground text-lg leading-tight sm:text-xl">
                    {section.title}
                  </h3>
                  <span className="whitespace-nowrap rounded-sm bg-primary/10 px-3 py-1.5 font-medium text-primary text-sm">
                    {section.questionCount} Q&amp;A
                  </span>
                </div>

                {section.highlight && (
                  <p className="mb-6 line-clamp-3 text-base text-muted-foreground leading-relaxed">
                    {section.highlight}
                  </p>
                )}

                <div className="mt-auto">
                  <Button
                    asChild
                    className="w-full justify-between rounded-sm py-3 text-base transition-colors group-hover:border-primary/50"
                    variant="outline"
                  >
                    <Link href={`/books#${section.id}`}>
                      {t("sectionCta")}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button
            asChild
            className="gap-3 rounded-sm bg-primary px-8 py-4 text-lg text-primary-foreground shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl"
            size="lg"
          >
            <Link href="/books">
              {t("cta")}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
});
