"use client";

import { ExternalLink, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { RichTextRenderer } from "@/components/rich-text-renderer";
import { Card } from "@/components/ui/card";

interface Source {
  location?: string;
  title: string;
  type: string;
  url: string;
}

export interface QuestionCardProps {
  answer: string;
  category: string;
  displayNumber?: number;
  question: string;
  score?: number;
  sequence?: number | null;
  showScore?: boolean;
  sources: Source[];
}

export function QuestionCard({
  question,
  answer,
  category,
  sources,
  score,
  sequence,
  displayNumber,
  showScore = false,
}: QuestionCardProps) {
  const t = useTranslations("questions");
  const number = displayNumber ?? sequence ?? 1;

  return (
    <Card className="border-2 p-4 transition-shadow hover:shadow-lg sm:p-6 lg:p-8">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm sm:h-10 sm:w-10 sm:text-base">
          {number}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-col gap-2 sm:mb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <h3 className="text-balance font-bold text-foreground text-lg sm:text-xl md:text-2xl">
              {question}
            </h3>
            <div className="flex items-center gap-2 self-start">
              <span className="whitespace-nowrap rounded-full bg-primary/10 px-2 py-1 font-medium text-primary text-xs sm:px-3 sm:text-sm">
                {category}
              </span>
              {showScore && score !== undefined && (
                <span className="whitespace-nowrap rounded-full bg-muted px-2 py-1 font-medium text-muted-foreground text-xs sm:px-3 sm:text-sm">
                  {(score * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>

          <RichTextRenderer className="mb-3 sm:mb-4" content={answer} />

          {sources.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <h4 className="flex items-center gap-2 font-semibold text-foreground text-xs sm:text-sm">
                <FileText className="h-3 w-3 flex-shrink-0" />
                {t("sourcesHeading", { count: sources.length })}
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                {sources.map((source, sourceIndex) => (
                  <a
                    className="group block"
                    href={source.url}
                    key={sourceIndex}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <Card className="relative h-full overflow-hidden p-3 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-md sm:p-4">
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-primary/50 to-primary opacity-0 transition-opacity group-hover:opacity-100" />
                      <div className="flex items-start justify-between gap-2 pl-2 sm:gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 font-medium text-foreground text-xs leading-relaxed transition-colors group-hover:text-primary sm:text-sm">
                            {source.title}
                          </p>
                          <div className="flex flex-col gap-1 text-muted-foreground text-xs">
                            <span className="inline-block w-fit rounded bg-muted px-2 py-0.5 text-xs">
                              {source.type}
                            </span>
                            {source.location && (
                              <span className="flex items-center gap-1 text-xs">
                                <FileText className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">
                                  {source.location}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary sm:h-4 sm:w-4" />
                      </div>
                    </Card>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
