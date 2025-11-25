"use client"

import { useState, useMemo, useEffect, useCallback, memo } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RichTextRenderer } from "@/components/rich-text-renderer"
import { AIChatDialog } from "@/components/ai-chat-dialog"
import { ChevronDown, ChevronRight, ExternalLink, FileText, MessageSquare, Menu, X, Loader2 } from "lucide-react"
import { usePaginatedQuestions } from "@/hooks/use-paginated-questions"

type QAData = {
  sections: Array<{
    section_id: string
    section_number: string
    section_title: string
    questions: Array<any>
    question_count: number
  }>
}

type QASection = QAData["sections"][number]
type QAQuestion = QASection["questions"][number]

function extractSources(question: QAQuestion | any) {
  return (question.sources ?? []).map((source: any) => ({
    title: source.title ?? source.url ?? "View source",
    url: source.url ?? "#",
    type: source.type ?? "reference",
    location: source.location ?? "",
  }))
}

// Memoized section item component for performance
const SectionItem = memo(({ 
  section, 
  isExpanded, 
  selectedQuestionId,
  onToggle, 
  onQuestionSelect 
}: {
  section: QASection
  isExpanded: boolean
  selectedQuestionId: string
  onToggle: () => void
  onQuestionSelect: (id: string) => void
}) => {
  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-sidebar-accent transition-colors group text-left"
      >
        <span className="font-semibold text-sidebar-foreground text-sm leading-snug text-left">
          {section.section_title}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-sidebar-foreground/60 bg-sidebar-accent px-2 py-0.5 rounded-full font-medium">
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
        <div className="ml-2 space-y-1 border-l-2 border-sidebar-border pl-2">
          {section.questions.map((question) => (
            <button
              key={question.id}
              onClick={() => onQuestionSelect(question.id)}
              className={`
                w-full text-left p-2 rounded text-sm transition-colors
                ${
                  selectedQuestionId === question.id
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }
              `}
            >
              {question.question}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
SectionItem.displayName = "SectionItem"

// Memoized source card component
const SourceCard = memo(({ 
  source, 
  index,
  questionId 
}: { 
  source: { title: string; url: string; type: string; location: string }
  index: number
  questionId: string
}) => {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <Card className="p-3 sm:p-4 hover:shadow-md transition-all hover:border-primary/50 hover:-translate-y-0.5 relative overflow-hidden h-full">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/50 to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-start justify-between gap-2 pl-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors text-xs sm:text-sm leading-relaxed mb-1 truncate">
              {source.title}
            </p>
            <div className="space-y-0.5 text-xs text-muted-foreground">
              <span className="bg-muted px-1.5 py-0.5 rounded font-medium inline-block text-xs">
                {source.type}
              </span>
              {source.location && <p className="text-xs">{source.location}</p>}
            </div>
          </div>
          <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </div>
      </Card>
    </a>
  )
})
SourceCard.displayName = "SourceCard"

// Memoized question content component
const QuestionContent = memo(({ 
  selectedEntry,
  selectedSources,
  selectedIndex,
  totalQuestions,
  onNavigate 
}: {
  selectedEntry: { section: QASection; question: QAQuestion } | undefined
  selectedSources: any[]
  selectedIndex: number
  totalQuestions: number
  onNavigate: (offset: number) => void
}) => {
  if (!selectedEntry) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Select a question from the sidebar to view details</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-medium text-sm">
            {selectedEntry.question.metadata?.category ?? selectedEntry.section.section_title}
          </span>
          <span className="text-sm text-muted-foreground">
            Question {selectedIndex + 1} of {totalQuestions}
          </span>
          <span className="text-sm text-muted-foreground/80">
            {selectedEntry.section.section_number
              ? `Section ${selectedEntry.section.section_number}`
              : selectedEntry.section.section_title}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4 w-full">
          {selectedEntry.question.question}
        </h1>
      </div>

      <Card className="p-6 sm:p-8">
        <RichTextRenderer content={selectedEntry.question.answer} />
      </Card>

      {selectedSources.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Sources & References
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedSources.slice(0, 3).map((source, index) => (
              <SourceCard
                key={`${selectedEntry.question.id}-source-${index}`}
                source={source}
                index={index}
                questionId={selectedEntry.question.id}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t">
        {selectedIndex > 0 && (
          <Button variant="outline" onClick={() => onNavigate(-1)} className="flex-1">
            <ChevronRight className="h-4 w-4 rotate-180 mr-2" />
            Previous Question
          </Button>
        )}
        {selectedIndex < totalQuestions - 1 && (
          <Button variant="outline" onClick={() => onNavigate(1)} className="flex-1">
            Next Question
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
})
QuestionContent.displayName = "QuestionContent"

export default function BooksPageClient({ locale }: { locale: string }) {
  const {
    sections: paginatedSections,
    loadMore,
    hasMore: hasMoreCurrentSection,
    isLoading,
    isLoadingCurrentSection,
    loadNextSection,
    hasMoreSections,
    isLoadingNextSection,
  } = usePaginatedQuestions(locale, "1")

  const sections = paginatedSections
  const isLoadingQa = isLoading
  const canLoadNextSection =
    !hasMoreCurrentSection &&
    sections.length > 0 &&
    hasMoreSections &&
    !isLoadingNextSection
  const nextSectionLabel = locale === "vi" ? "Chương tiếp theo" : "Load next section"
  
  // Build question entries from static data (for sidebar navigation)
  const questionEntries = useMemo(
    () =>
      sections.flatMap((section) =>
        section.questions.map((question) => ({
          section,
          question,
        })),
      ),
    [sections],
  )

  const totalQuestions = questionEntries.length
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)

  useEffect(() => {
    if (!isLoadingQa && questionEntries.length > 0 && !selectedQuestionId) {
      setSelectedQuestionId(questionEntries[0].question.id)
      setExpandedSections(new Set(sections.map((section) => section.section_id)))
    }
  }, [isLoadingQa, questionEntries, sections, selectedQuestionId])

  // Try to find in paginated data first, fallback to static data
  const selectedEntry = useMemo(() => {
    const staticEntry = questionEntries.find((entry) => entry.question.id === selectedQuestionId)
    return staticEntry
  }, [questionEntries, selectedQuestionId])

  const selectedSources = useMemo(
    () => (selectedEntry ? extractSources(selectedEntry.question) : []),
    [selectedEntry],
  )

  const selectedIndex = useMemo(
    () => questionEntries.findIndex((entry) => entry.question.id === selectedQuestionId),
    [questionEntries, selectedQuestionId],
  )

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const updated = new Set(prev)
      if (updated.has(sectionId)) {
        updated.delete(sectionId)
      } else {
        updated.add(sectionId)
      }
      return updated
    })
  }, [])

  const handleQuestionSelect = useCallback((questionId: string) => {
    setSelectedQuestionId(questionId)
    setIsSidebarOpen(false)
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [])

  const handleNavigate = useCallback((offset: number) => {
    const newIndex = selectedIndex + offset
    const nextEntry = questionEntries[newIndex]
    if (nextEntry) {
      handleQuestionSelect(nextEntry.question.id)
    }
  }, [selectedIndex, questionEntries, handleQuestionSelect])

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <div className="lg:hidden fixed top-20 left-4 z-40">
        <Button
          size="icon"
          variant="outline"
          className="bg-background shadow-lg"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex-1 flex pt-16">
        <aside
          className={`
            fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-80 bg-sidebar border-r border-sidebar-border
            overflow-y-auto z-30 transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          {isLoadingQa ? (
            <div className="p-4 sm:p-6 flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-sidebar-foreground">Loading...</span>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-3">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-sidebar-foreground mb-2">Carbon Market Guide</h2>
                <p className="text-sm text-sidebar-foreground/70">Browse by section</p>
              </div>

              {sections.map((section) => (
                <SectionItem
                  key={section.section_id}
                  section={section}
                  isExpanded={expandedSections.has(section.section_id)}
                  selectedQuestionId={selectedQuestionId}
                  onToggle={() => toggleSection(section.section_id)}
                  onQuestionSelect={handleQuestionSelect}
                />
              ))}

              {/* Load more button for current section */}
              {hasMoreCurrentSection && (
                <div className="pt-4 pb-2">
                  <Button
                    onClick={loadMore}
                    disabled={isLoadingCurrentSection}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    {isLoadingCurrentSection ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More Questions"
                    )}
                  </Button>
                </div>
              )}

              {!hasMoreCurrentSection && canLoadNextSection && (
                <div className="pt-4 pb-2">
                  <Button
                    onClick={loadNextSection}
                    disabled={!canLoadNextSection}
                    variant="secondary"
                    className="w-full"
                    size="sm"
                  >
                    {isLoadingNextSection ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {nextSectionLabel}
                      </>
                    ) : (
                      nextSectionLabel
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </aside>

        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-12 max-w-4xl xl:max-w-6xl">
            <QuestionContent
              selectedEntry={selectedEntry}
              selectedSources={selectedSources}
              selectedIndex={selectedIndex}
              totalQuestions={totalQuestions}
              onNavigate={handleNavigate}
            />
          </div>

          <div className="fixed bottom-6 right-6 z-30">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg gap-2 rounded-full px-6"
              onClick={() => setIsChatOpen(true)}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="hidden sm:inline">Ask AI</span>
            </Button>
          </div>
        </main>
      </div>

      <Footer />

      <AIChatDialog
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialContext={selectedEntry?.question.question}
      />
    </div>
  )
}
