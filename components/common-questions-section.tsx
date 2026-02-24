"use client";

import {
  ChevronRight,
  ExternalLink,
  FileText,
  MessageSquare,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AIChatDialog } from "@/components/ai-chat-dialog";
import { RichTextRenderer } from "@/components/rich-text-renderer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <section
      className="bg-background py-12 sm:py-16 lg:py-32"
      data-tour="common-questions"
      id="common"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center sm:mb-16">
          <h2 className="mb-3 text-balance px-2 font-bold text-2xl text-foreground sm:mb-4 sm:text-3xl md:text-4xl lg:text-5xl">
            {t("title")}
          </h2>
          <p className="mx-auto max-w-2xl text-pretty px-2 text-base text-muted-foreground sm:text-lg">
            {t("description")}
          </p>
        </div>

        <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
          {featuredQuestions.map((question, index) => (
            <Card
              className="border-2 p-4 transition-shadow hover:shadow-lg sm:p-6 lg:p-8"
              key={question.id}
            >
              <div className="space-y-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm sm:h-10 sm:w-10 sm:text-base">
                  {index + 1}
                </div>
                <Link href={`/books#${question.id}`}>
                  <h3 className="mb-2 w-full cursor-pointer font-bold text-foreground text-lg transition-colors hover:text-primary sm:mb-3 sm:text-xl md:text-2xl">
                    {question.question}
                  </h3>
                </Link>
                <RichTextRenderer
                  className="mb-3 sm:mb-4"
                  content={question.preview}
                />

                <div className="mb-3 flex flex-wrap items-center gap-2 text-muted-foreground text-xs sm:mb-4 sm:text-sm">
                  <span className="rounded-full bg-primary/10 px-2 py-1 font-medium text-primary text-xs sm:px-3 sm:text-sm">
                    {question.category}
                  </span>
                </div>

                {question.sources.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 font-bold text-foreground text-lg sm:text-xl">
                      <FileText className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                      Sources & References
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {question.sources
                        .slice(0, 3)
                        .map((source, sourceIndex) => (
                          <a
                            className="group block"
                            href={source.url}
                            key={`${question.id}-${sourceIndex}`}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            <Card className="relative h-full overflow-hidden p-3 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md sm:p-4">
                              <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-primary/50 to-primary opacity-0 transition-opacity group-hover:opacity-100" />
                              <div className="flex items-center justify-between gap-2 pl-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-semibold text-foreground text-xs leading-relaxed transition-colors group-hover:text-primary sm:text-sm">
                                    {source.title} - {source.type}{" "}
                                    {source.location && ` - ${source.location}`}
                                  </p>
                                </div>
                                <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary sm:h-4 sm:w-4" />
                              </div>
                            </Card>
                          </a>
                        ))}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full gap-2 bg-transparent text-sm sm:w-auto"
                  onClick={() => {
                    setCurrentQuestion(question.question);
                    setIsChatOpen(true);
                  }}
                  size="sm"
                  variant="outline"
                >
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                  {t("askAI")}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-8 px-4 text-center sm:mt-12">
          <Button
            asChild
            className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            size="lg"
          >
            <Link href="/books">
              {t("viewAll")}
              <ChevronRight className="h-5 w-5" />
            </Link>
          </Button>
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
