"use client";

import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  Menu,
  MessageSquare,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AIChatDialog } from "@/components/ai-chat-dialog";
import { Footer } from "@/components/footer";
import { Navigation } from "@/components/navigation";
import { RichTextRenderer } from "@/components/rich-text-renderer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePaginatedQuestions } from "@/hooks/use-paginated-questions";

type QAData = {
  sections: Array<{
    section_id: string;
    section_number: string;
    section_title: string;
    questions: Array<any>;
    question_count: number;
  }>;
};

type QASection = QAData["sections"][number];
type QAQuestion = QASection["questions"][number];

function extractSources(question: QAQuestion | any) {
  return (question.sources ?? []).map((source: any) => ({
    title: source.title ?? source.url ?? "View source",
    url: source.url ?? "#",
    type: source.type ?? "reference",
    location: source.location ?? "",
  }));
}

// Memoized section item component for performance
const SectionItem = memo(
  ({
    section,
    isExpanded,
    selectedQuestionId,
    onToggle,
    onQuestionSelect,
  }: {
    section: QASection;
    isExpanded: boolean;
    selectedQuestionId: string;
    onToggle: (sectionId: string) => void;
    onQuestionSelect: (id: string) => void;
  }) => {
    const handleToggle = useCallback(() => {
      onToggle(section.section_id);
    }, [onToggle, section.section_id]);

    return (
      <div className="space-y-1">
        <button
          className="group flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-sidebar-accent"
          onClick={handleToggle}
        >
          <span className="text-left font-semibold text-sidebar-foreground text-sm leading-snug">
            {section.section_title}
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sidebar-accent px-2 py-0.5 font-medium text-sidebar-foreground/60 text-xs">
              {section.question_count}
            </span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
            ) : (
              <ChevronRight className="h-4 w-4 text-sidebar-foreground/60" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="ml-2 space-y-1 border-sidebar-border border-l-2 pl-2">
            {section.questions.map((question) => (
              <button
                className={`w-full rounded p-2 text-left text-sm transition-colors ${
                  selectedQuestionId === question.id
                    ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }
              `}
                key={question.id}
                onClick={() => onQuestionSelect(question.id)}
              >
                {question.question}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);
SectionItem.displayName = "SectionItem";

// Memoized source card component
const SourceCard = memo(
  ({
    source,
    index,
    questionId,
  }: {
    source: { title: string; url: string; type: string; location: string };
    index: number;
    questionId: string;
  }) => {
    return (
      <a
        className="group block"
        href={source.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Card className="relative h-full overflow-hidden p-3 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md sm:p-4">
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-primary/50 to-primary opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="flex items-start justify-between gap-2 pl-2">
            <div className="min-w-0 flex-1">
              <p className="mb-1 truncate font-semibold text-foreground text-xs leading-relaxed transition-colors group-hover:text-primary sm:text-sm">
                {source.title}
              </p>
              <div className="space-y-0.5 text-muted-foreground text-xs">
                <span className="inline-block rounded bg-muted px-1.5 py-0.5 font-medium text-xs">
                  {source.type}
                </span>
                {source.location && (
                  <p className="text-xs">{source.location}</p>
                )}
              </div>
            </div>
            <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary sm:h-4 sm:w-4" />
          </div>
        </Card>
      </a>
    );
  }
);
SourceCard.displayName = "SourceCard";

// Memoized question content component
const QuestionContent = memo(
  ({
    selectedEntry,
    selectedSources,
    selectedIndex,
    totalQuestions,
    onNavigate,
  }: {
    selectedEntry: { section: QASection; question: QAQuestion } | undefined;
    selectedSources: any[];
    selectedIndex: number;
    totalQuestions: number;
    onNavigate: (offset: number) => void;
  }) => {
    if (!selectedEntry) {
      return (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            Select a question from the sidebar to view details
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6 sm:space-y-8">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary text-sm">
              {selectedEntry.question.metadata?.category ??
                selectedEntry.section.section_title}
            </span>
            <span className="text-muted-foreground text-sm">
              Question {selectedIndex + 1} of {totalQuestions}
            </span>
            <span className="text-muted-foreground/80 text-sm">
              {selectedEntry.section.section_number
                ? `Section ${selectedEntry.section.section_number}`
                : selectedEntry.section.section_title}
            </span>
          </div>
          <h1 className="mb-4 w-full font-bold text-foreground text-xl sm:text-2xl md:text-3xl">
            {selectedEntry.question.question}
          </h1>
        </div>

        <Card className="p-6 sm:p-8">
          <RichTextRenderer content={selectedEntry.question.answer} />
        </Card>

        {selectedSources.length > 0 && (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-bold text-foreground text-xl sm:text-2xl">
              <FileText className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
              Sources & References
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selectedSources.slice(0, 3).map((source, sourcePosition) => (
                <SourceCard
                  index={sourcePosition}
                  key={`${selectedEntry.question.id}-${source.url}-${source.location || source.title}`}
                  questionId={selectedEntry.question.id}
                  source={source}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:gap-4">
          {selectedIndex > 0 && (
            <Button
              className="flex-1"
              onClick={() => onNavigate(-1)}
              variant="outline"
            >
              <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
              Previous Question
            </Button>
          )}
          {selectedIndex < totalQuestions - 1 && (
            <Button
              className="flex-1"
              onClick={() => onNavigate(1)}
              variant="outline"
            >
              Next Question
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }
);
QuestionContent.displayName = "QuestionContent";

export default function BooksPageClient() {
  // Use useLocale() for stable locale value to prevent hydration mismatches
  const locale = useLocale();
  const t = useTranslations("books");

  const {
    sections: paginatedSections,
    availableSections,
    loadMore,
    hasMore: hasMoreCurrentSection,
    isLoading,
    isLoadingCurrentSection,
    loadNextSection,
    hasMoreSections,
    isLoadingNextSection,
    currentSection,
  } = usePaginatedQuestions(locale, "1");

  const sections = paginatedSections;
  const isLoadingQa = isLoading;

  // Check if current section is fully loaded
  const currentSectionData = sections.find(
    (s) => s.section_number === currentSection
  );
  const isCurrentSectionComplete = currentSectionData && !hasMoreCurrentSection;

  // Can load next section only when current section is complete
  const canLoadNextSection =
    isCurrentSectionComplete && hasMoreSections && !isLoadingNextSection;

  // Build question entries from static data (for sidebar navigation)
  const questionEntries = useMemo(
    () =>
      sections.flatMap((section) =>
        section.questions.map((question) => ({
          section,
          question,
        }))
      ),
    [sections]
  );

  const totalQuestions = questionEntries.length;
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (!isLoadingQa && questionEntries.length > 0 && !selectedQuestionId) {
      setSelectedQuestionId(questionEntries[0].question.id);
      setExpandedSections(
        new Set(sections.map((section) => section.section_id))
      );
    }
  }, [isLoadingQa, questionEntries, sections, selectedQuestionId]);

  // Try to find in paginated data first, fallback to static data
  const selectedEntry = useMemo(() => {
    const staticEntry = questionEntries.find(
      (entry) => entry.question.id === selectedQuestionId
    );
    return staticEntry;
  }, [questionEntries, selectedQuestionId]);

  const selectedSources = useMemo(
    () => (selectedEntry ? extractSources(selectedEntry.question) : []),
    [selectedEntry]
  );

  const selectedIndex = useMemo(
    () =>
      questionEntries.findIndex(
        (entry) => entry.question.id === selectedQuestionId
      ),
    [questionEntries, selectedQuestionId]
  );

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const updated = new Set(prev);
      if (updated.has(sectionId)) {
        updated.delete(sectionId);
      } else {
        updated.add(sectionId);
      }
      return updated;
    });
  }, []);

  const handleQuestionSelect = useCallback((questionId: string) => {
    setSelectedQuestionId(questionId);
    setIsSidebarOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleNavigate = useCallback(
    (offset: number) => {
      const newIndex = selectedIndex + offset;
      const nextEntry = questionEntries[newIndex];
      if (nextEntry) {
        handleQuestionSelect(nextEntry.question.id);
      }
    },
    [selectedIndex, questionEntries, handleQuestionSelect]
  );

  const handleSidebarToggle = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const handleChatOpen = useCallback(() => {
    setIsChatOpen(true);
  }, []);

  const handleChatClose = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <div className="fixed top-20 left-4 z-40 lg:hidden">
        <Button
          className="bg-background shadow-lg"
          onClick={handleSidebarToggle}
          size="icon"
          variant="outline"
        >
          {isSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="flex flex-1 pt-16">
        <aside
          className={`fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-80 overflow-y-auto border-sidebar-border border-r bg-sidebar transition-transform duration-300 ease-in-out lg:sticky ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          {isLoadingQa ? (
            <div className="flex h-full items-center justify-center p-4 sm:p-6">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-sidebar-foreground">Loading...</span>
            </div>
          ) : (
            <div className="space-y-3 p-4 sm:p-6">
              <div className="mb-6">
                <h2 className="mb-2 font-bold text-sidebar-foreground text-xl">
                  Carbon Market Guide
                </h2>
                <p className="text-sidebar-foreground/70 text-sm">
                  {availableSections.length > 0
                    ? `${sections.length} of ${availableSections.length} sections loaded`
                    : "Browse by section"}
                </p>
              </div>

              {sections.map((section) => (
                <SectionItem
                  isExpanded={expandedSections.has(section.section_id)}
                  key={section.section_id}
                  onQuestionSelect={handleQuestionSelect}
                  onToggle={toggleSection}
                  section={section}
                  selectedQuestionId={selectedQuestionId}
                />
              ))}

              {/* Load more button for current section */}
              {hasMoreCurrentSection && (
                <div className="pt-4 pb-2">
                  <Button
                    className="w-full"
                    disabled={isLoadingCurrentSection}
                    onClick={loadMore}
                    size="sm"
                    variant="outline"
                  >
                    {isLoadingCurrentSection ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("loading")}
                      </>
                    ) : (
                      <>
                        {t("loadMoreQuestions")}
                        {currentSectionData && (
                          <span className="ml-2 text-muted-foreground text-xs">
                            ({currentSectionData.question_count}/
                            {currentSectionData.totalCount || "?"})
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Load next section button */}
              {canLoadNextSection && (
                <div className="pt-4 pb-2">
                  <Button
                    className="w-full"
                    disabled={!canLoadNextSection}
                    onClick={loadNextSection}
                    size="sm"
                    variant="secondary"
                  >
                    {isLoadingNextSection ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("loadNextSection")}
                      </>
                    ) : (
                      <>
                        {t("loadNextSection")}
                        {availableSections.length > 0 && (
                          <span className="ml-2 text-muted-foreground text-xs">
                            ({sections.length + 1}/{availableSections.length})
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Show completion message when all sections are loaded */}
              {!hasMoreSections &&
                sections.length > 0 &&
                !hasMoreCurrentSection && (
                  <div className="pt-4 pb-2 text-center">
                    <p className="text-sidebar-foreground/60 text-sm">
                      ✓ All {totalQuestions} questions loaded
                    </p>
                  </div>
                )}
            </div>
          )}
        </aside>

        {isSidebarOpen && (
          <button
            aria-label="Close sidebar"
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={handleSidebarClose}
            type="button"
          />
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 xl:max-w-6xl xl:px-12">
            <QuestionContent
              onNavigate={handleNavigate}
              selectedEntry={selectedEntry}
              selectedIndex={selectedIndex}
              selectedSources={selectedSources}
              totalQuestions={totalQuestions}
            />
          </div>

          <div className="fixed right-6 bottom-6 z-30">
            <Button
              className="gap-2 rounded-full bg-primary px-6 text-primary-foreground shadow-lg hover:bg-primary/90"
              onClick={handleChatOpen}
              size="lg"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="hidden sm:inline">Ask AI</span>
            </Button>
          </div>
        </main>
      </div>

      <Footer />

      <AIChatDialog
        initialContext={selectedEntry?.question.question}
        isOpen={isChatOpen}
        onClose={handleChatClose}
      />
    </div>
  );
}
