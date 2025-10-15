"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Layers } from "lucide-react";
import qaData from "@/data/qa_new.json";

type QASection = (typeof qaData.sections)[number];

export function KnowledgeOverview() {
  const t = useTranslations("knowledgeOverview");
  const locale = useLocale();
  const sections: QASection[] = qaData.sections ?? [];

  const totalQuestions = sections.reduce((count, section) => count + section.questions.length, 0);
  const featuredSections = sections.slice(0, 6).map((section) => ({
    id: section.section_id,
    title: section.section_title,
    questionCount: section.question_count ?? section.questions.length,
    highlight: section.questions[0]?.question ?? "",
  }));

  return (
    <section className="py-16 sm:py-20 lg:py-28 bg-gradient-to-br from-muted/30 via-background to-muted/20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-small-black/[0.02] -z-10" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 shadow-sm">
            <Layers className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wide">{t("spotlight")}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 text-balance leading-tight">
            {t("title")}
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
            {t("subtitle")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Badge variant="secondary" className="text-sm px-4 py-2 shadow-sm">
              {t("totalSections", { count: sections.length })}
            </Badge>
            <Badge variant="outline" className="text-sm px-4 py-2">
              {t("totalQuestions", { count: totalQuestions })}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-12 sm:mb-16">
          {featuredSections.map((section, index) => (
            <Card
              key={section.id}
              className="group h-full p-6 sm:p-8 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card/80 backdrop-blur-sm relative overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Card gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-foreground leading-tight flex-1">
                    {section.title}
                  </h3>
                  <span className="text-sm text-muted-foreground bg-muted/80 px-3 py-1.5 rounded-full font-medium whitespace-nowrap">
                    {section.questionCount} Q&A
                  </span>
                </div>

                {section.highlight && (
                  <p className="text-base text-muted-foreground mb-6 line-clamp-3 leading-relaxed">
                    {section.highlight}
                  </p>
                )}

                <div className="mt-auto">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-between text-base py-3 group-hover:border-primary/50 transition-colors"
                  >
                    <Link href={`/${locale}/books#${section.id}`}>
                      {t("sectionCta")}
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-3 px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
          >
            <Link href={`/${locale}/books`}>
              {t("cta")}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
