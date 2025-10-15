"use client";

import { Card } from "@/components/ui/card";
import { ExternalLink, FileText } from "lucide-react";
import { RichTextRenderer } from "@/components/rich-text-renderer";
import { useTranslations } from "next-intl";

interface Source {
  type: string;
  title: string;
  url: string;
  location?: string;
}

export interface QuestionCardProps {
  question: string;
  answer: string;
  category: string;
  sources: Source[];
  score?: number;
  sequence?: number | null;
  displayNumber?: number;
  showScore?: boolean;
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
    <Card className="p-4 sm:p-6 lg:p-8 border-2 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="bg-primary/10 text-primary rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold flex-shrink-0 text-sm sm:text-base">
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground text-balance">
              {question}
            </h3>
            <div className="flex items-center gap-2 self-start">
              <span className="bg-primary/10 text-primary px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                {category}
              </span>
              {showScore && score !== undefined && (
                <span className="bg-muted text-muted-foreground px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                  {(score * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>

          <RichTextRenderer content={answer} className="mb-3 sm:mb-4" />

          {sources.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <h4 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-3 w-3 flex-shrink-0" />
                {t("sourcesHeading", { count: sources.length })}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {sources.map((source, sourceIndex) => (
                  <a
                    key={sourceIndex}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block"
                  >
                    <Card className="p-3 sm:p-4 hover:shadow-md transition-all hover:border-primary/50 hover:-translate-y-1 relative overflow-hidden h-full">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/50 to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-start justify-between gap-2 sm:gap-3 pl-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors text-xs sm:text-sm leading-relaxed mb-1">
                            {source.title}
                          </p>
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <span className="bg-muted px-2 py-0.5 rounded inline-block w-fit text-xs">
                              {source.type}
                            </span>
                            {source.location && (
                              <span className="flex items-center gap-1 text-xs">
                                <FileText className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{source.location}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
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
