"use client";

import { ArrowRight, Layers } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import qaData from "@/data/qa_new.json";
import { Link } from "@/lib/navigation";

type QASection = (typeof qaData.sections)[number];

type QASection = (typeof qaData.sections)[number];

export const KnowledgeOverview = memo(function KnowledgeOverview() {
  const t = useTranslations("knowledgeOverview");
  const locale = useLocale();

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
    <section className="relative overflow-hidden bg-gradient-to-br from-muted/30 via-background to-muted/20 py-16 sm:py-20 lg:py-28">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-grid-small-black/[0.02]" />
      <div className="absolute top-0 right-0 -z-10 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 -z-10 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center sm:mb-16 lg:mb-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary shadow-sm">
            <Layers className="h-4 w-4" />
            <span className="font-medium text-sm uppercase tracking-wide">
              {t("spotlight")}
            </span>
          </div>
          {/* <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 text-balance leading-tight">
            {t("title")}
          </h2> */}
          <p className="mx-auto max-w-3xl text-pretty text-lg text-muted-foreground leading-relaxed sm:text-xl">
            {t("subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Badge className="px-4 py-2 text-sm shadow-sm" variant="secondary">
              {t("totalSections", { count: sections.length })}
            </Badge>
            <Badge className="px-4 py-2 text-sm" variant="outline">
              {t("totalQuestions", { count: totalQuestions })}
            </Badge>
          </div>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-6 sm:mb-16 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {featuredSections.map((section, index) => (
            <Card
              className="group relative h-full overflow-hidden border-0 bg-card/80 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-8"
              key={section.id}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Card gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative z-10 flex h-full flex-col">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <h3 className="flex-1 font-bold text-foreground text-lg leading-tight sm:text-xl">
                    {section.title}
                  </h3>
                  <span className="whitespace-nowrap rounded-full bg-muted/80 px-3 py-1.5 font-medium text-muted-foreground text-sm">
                    {section.questionCount} Q&A
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
                    className="w-full justify-between py-3 text-base transition-colors group-hover:border-primary/50"
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
            className="gap-3 bg-primary px-8 py-4 text-lg text-primary-foreground shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl"
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
