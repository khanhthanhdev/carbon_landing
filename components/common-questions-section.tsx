"use client";

import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AIChatDialog } from "@/components/ai-chat-dialog";
import { RichTextRenderer } from "@/components/rich-text-renderer";
import { Button } from "@/components/ui/button";
import qaDataEn from "@/data/qa_en.json";
import qaDataVi from "@/data/qa_new.json";
import { Link } from "@/lib/navigation";

type QASection = (typeof qaDataVi.sections)[number];
type QAQuestion = QASection["questions"][number];

function transformSources(question: QAQuestion) {
  return (question.sources ?? []).map((source) => ({
    title: source.title ?? source.url ?? "View source",
    url: source.url ?? "#",
    type: source.type ?? "reference",
    location: (source as { location?: string }).location ?? "",
  }));
}

function createPreview(answer: string, limit = 700) {
  if (answer.length <= limit) {
    return answer;
  }
  const truncated = answer.slice(0, limit);
  return `${truncated.replace(/\s+\S*$/, "")}…`;
}

// Accent colors cycling for question numbers
const accentVariants = [
  "bg-primary text-primary-foreground",
  "bg-secondary/80 text-secondary-foreground",
  "bg-accent/70 text-accent-foreground",
  "bg-primary/80 text-primary-foreground",
  "bg-secondary text-secondary-foreground",
];

interface QuestionAccordionProps {
  askAILabel: string;
  index: number;
  onAskAI: (q: string) => void;
  question: {
    id: string;
    question: string;
    preview: string;
    fullAnswer: string;
    category: string;
    sources: { title: string; url: string; type: string; location: string }[];
  };
  sourcesTitle: string;
}

function QuestionAccordion({
  question,
  index,
  onAskAI,
  askAILabel,
  sourcesTitle,
}: QuestionAccordionProps) {
  const [isOpen, setIsOpen] = useState(index === 0);

  return (
    <div
      className={`group overflow-hidden rounded-2xl border transition-all duration-300 ${
        isOpen
          ? "border-primary/30 bg-card shadow-lg shadow-primary/5"
          : "border-border bg-card/60 hover:border-primary/20 hover:bg-card hover:shadow-md"
      }`}
    >
      {/* Question header - clickable */}
      <button
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-start gap-4 px-6 py-5 text-left sm:gap-5 sm:px-8 sm:py-6"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {/* Number badge */}
        <div
          className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl font-bold text-sm transition-all duration-200 sm:h-9 sm:w-9 ${accentVariants[index % accentVariants.length]}`}
        >
          {String(index + 1).padStart(2, "0")}
        </div>

        {/* Question text */}
        <div className="min-w-0 flex-1">
          <h3
            className={`font-semibold text-base leading-snug transition-colors sm:text-lg ${
              isOpen
                ? "text-primary"
                : "text-foreground group-hover:text-primary"
            }`}
          >
            {question.question}
          </h3>
        </div>

        {/* Chevron */}
        <ChevronDown
          className={`mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-300 ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

      {/* Expandable answer */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-border/50 border-t px-6 pt-5 pb-6 sm:px-8 sm:pb-8">
          {/* Subtle left border accent */}
          <div className="flex gap-4 sm:gap-6">
            <div className="w-px flex-shrink-0 rounded-full bg-gradient-to-b from-primary/40 to-transparent" />

            <div className="min-w-0 flex-1 space-y-5">
              {/* Answer content */}
              <RichTextRenderer
                className="text-foreground/85 text-sm leading-relaxed sm:text-base"
                content={question.preview}
              />

              {/* Sources */}
              {question.sources.length > 0 && (
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 font-semibold text-foreground text-sm">
                    <FileText className="h-4 w-4 text-primary" />
                    {sourcesTitle}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {question.sources.slice(0, 3).map((source, sourceIndex) => (
                      <a
                        className="group/source inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                        href={source.url}
                        key={`${question.id}-${sourceIndex}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60 transition-opacity group-hover/source:opacity-100" />
                        <span className="max-w-[200px] truncate font-medium text-foreground/80 transition-colors group-hover/source:text-primary">
                          {source.title}
                          {source.location && ` — ${source.location}`}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions row */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  className="h-8 gap-1.5 rounded-lg text-xs"
                  onClick={() => onAskAI(question.question)}
                  size="sm"
                  variant="outline"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {askAILabel}
                </Button>

                <Link
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-muted-foreground text-xs transition-colors hover:text-primary"
                  href={`/books#${question.id}`}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  Read full answer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommonQuestionsSection() {
  const t = useTranslations("commonQuestions");
  const locale = useLocale();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");

  const qaData = locale === "vi" ? qaDataVi : qaDataEn;

  const featuredQuestions = useMemo(() => {
    const sections: QASection[] = qaData.sections ?? [];
    const allQuestions = sections.flatMap((section) =>
      section.questions.map((question) => ({
        id: question.id,
        question: question.question,
        preview: createPreview(question.answer),
        fullAnswer: question.answer,
        category: question.metadata?.category ?? section.section_title,
        sources: transformSources(question),
      }))
    );

    return allQuestions.slice(0, 5);
  }, [qaData]);

  const handleAskAI = (question: string) => {
    setCurrentQuestion(question);
    setIsChatOpen(true);
  };

  return (
    <section
      className="bg-background py-16 sm:py-20 lg:py-28"
      data-tour="common-questions"
      id="common"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <h2 className="mb-3 text-balance font-bold text-2xl text-foreground sm:text-3xl md:text-4xl">
            {t("title")}
          </h2>
          <p className="text-pretty text-base text-muted-foreground sm:text-lg">
            {t("description")}
          </p>
        </div>

        {/* Two-column layout: questions + sticky sidebar */}
        <div className="mx-auto max-w-5xl lg:flex lg:gap-10">
          {/* Main accordion column */}
          <div className="min-w-0 flex-1 space-y-3 sm:space-y-4">
            {featuredQuestions.map((question, index) => (
              <QuestionAccordion
                askAILabel={t("askAI")}
                index={index}
                key={question.id}
                onAskAI={handleAskAI}
                question={question}
                sourcesTitle={t("sourcesTitle")}
              />
            ))}

            {/* View all CTA — inline below accordion on mobile */}
            <div className="pt-4 lg:hidden">
              <Button asChild className="w-full gap-2 sm:w-auto" size="lg">
                <Link href="/books">{t("viewAll")}</Link>
              </Button>
            </div>
          </div>

          {/* Sticky sidebar — desktop only */}
          <div className="hidden lg:block lg:w-64 lg:shrink-0">
            <div className="sticky top-24 space-y-4">
              {/* CTA card */}
              <div className="overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 to-primary/10 p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground text-sm">
                  Explore all questions
                </h3>
                <p className="mb-4 text-muted-foreground text-xs leading-relaxed">
                  Dive into our full knowledge base with 50+ Q&amp;A pairs on
                  carbon markets.
                </p>
                <Button asChild className="w-full gap-1.5" size="sm">
                  <Link href="/books">
                    {t("viewAll")}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              {/* AI chat card */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mb-1.5 font-semibold text-foreground text-sm">
                  Still have questions?
                </h3>
                <p className="mb-4 text-muted-foreground text-xs leading-relaxed">
                  Ask our AI assistant trained on carbon market knowledge.
                </p>
                <Button
                  className="w-full gap-1.5"
                  onClick={() => {
                    setCurrentQuestion("");
                    setIsChatOpen(true);
                  }}
                  size="sm"
                  variant="outline"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Ask AI
                </Button>
              </div>

              {/* Question count indicator */}
              <div className="rounded-xl bg-muted/60 px-4 py-3 text-center">
                <p className="font-bold text-2xl text-primary tabular-nums">
                  5
                  <span className="font-normal text-muted-foreground text-sm">
                    {" "}
                    / 50+
                  </span>
                </p>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  questions shown
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AIChatDialog
        initialContext={currentQuestion}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </section>
  );
}
