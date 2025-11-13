"use client";

import { useMemo, useState } from "react";
import { Link } from "@/lib/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, MessageSquare, ChevronRight } from "lucide-react";
import { RichTextRenderer } from "@/components/rich-text-renderer";
import { AIChatDialog } from "@/components/ai-chat-dialog";
import qaDataVi from "@/data/qa_new.json";
import qaDataEn from "@/data/qa_en.json";

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

  const qaData = locale === 'vi' ? qaDataVi : qaDataEn;

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
      })),
    );

    return allQuestions.slice(0, 5);
  }, [qaData]);

  return (
    <section className="py-12 sm:py-16 lg:py-32 bg-background" id="common">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4 text-balance px-2">
            {t("title")}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto text-pretty px-2">
            {t("description")}
          </p>
        </div>

        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
          {featuredQuestions.map((question, index) => (
            <Card
              key={question.id}
              className="p-4 sm:p-6 lg:p-8 border-2 hover:shadow-lg transition-shadow"
            >
              <div className="space-y-4">
                <div className="bg-primary/10 text-primary rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold flex-shrink-0 text-sm sm:text-base">
                  {index + 1}
                </div>
                <Link href={`/books#${question.id}`}>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-2 sm:mb-3 w-full hover:text-primary transition-colors cursor-pointer">
                    {question.question}
                  </h3>
                </Link>
                <RichTextRenderer content={question.preview} className="mb-3 sm:mb-4" />

                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  <span className="bg-primary/10 text-primary px-2 sm:px-3 py-1 rounded-full font-medium text-xs sm:text-sm">
                    {question.category}
                  </span>
                </div>

                {question.sources.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      Sources & References
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {question.sources.slice(0, 3).map((source, sourceIndex) => (
                        <a
                          key={`${question.id}-${sourceIndex}`}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block"
                        >
                          <Card className="p-3 sm:p-4 hover:shadow-md transition-all hover:border-primary/50 hover:-translate-y-0.5 relative overflow-hidden h-full">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/50 to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center justify-between gap-2 pl-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground group-hover:text-primary transition-colors text-xs sm:text-sm leading-relaxed truncate">
                                  {source.title} - {source.type} {source.location && ` - ${source.location}`}
                                </p>
                              </div>
                              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                            </div>
                          </Card>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => {
                    setCurrentQuestion(question.question);
                    setIsChatOpen(true);
                  }}
                  className="w-full sm:w-auto gap-2 bg-transparent text-sm"
                  variant="outline"
                  size="sm"
                >
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                  {t("askAI")}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8 sm:mt-12 px-4">
          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 w-full sm:w-auto"
          >
            <Link href="/books">
              {t("viewAll")}
              <ChevronRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>

      <AIChatDialog
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialContext={currentQuestion}
      />
    </section>
  );
}
