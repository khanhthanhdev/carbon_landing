"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeft, ChevronRight, MessageSquare, Info, Zap, Lock, BookOpen } from "lucide-react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"

interface AIChatSidebarProps {
  isOpen: boolean
  onToggle: () => void
  sessionId: string
  selectedTopic?: string
  onTopicChange?: (topic: string) => void
}

export function AIChatSidebar({
  isOpen,
  onToggle,
  sessionId,
  selectedTopic = "general",
  onTopicChange,
}: AIChatSidebarProps) {
  const t = useTranslations("aiChat.sidebar")

  return (
    <>
      {/* Toggle button for mobile */}
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-24 z-40 lg:hidden bg-background border-border hover:bg-accent"
        onClick={onToggle}
      >
        {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>

      {/* Sidebar - Fixed on desktop, overlay on mobile */}
      <aside
        className={`fixed lg:fixed inset-y-0 left-0 z-30 w-72 bg-sidebar border-r border-sidebar-border transition-transform duration-300 top-16 lg:top-16 h-[calc(100vh-64px)] lg:h-[calc(100vh-80px)] flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 p-4 border-b border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-sidebar-foreground">{t("title")}</h2>
              <p className="text-xs text-sidebar-foreground/60">{t("subtitle")}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-4 space-y-4">
            {/* Topic Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wide">
                  {t("topicsTitle")}
                </h3>
              </div>
              <p className="text-xs text-sidebar-foreground/60 px-1 leading-relaxed">
                {t("topicsDescription")}
              </p>
              
              <div className="grid grid-cols-1 gap-2">
                {(["general", "trading", "policy", "projects", "accounting", "compliance", "voluntary", "technology"] as const).map((topic) => (
                  <Button
                    key={topic}
                    variant={selectedTopic === topic ? "default" : "ghost"}
                    size="sm"
                    className={`justify-start text-xs h-auto py-2 px-3 ${
                      selectedTopic === topic 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                    }`}
                    onClick={() => onTopicChange?.(topic)}
                  >
                    <span className="text-left leading-tight">{t(`topics.${topic}`)}</span>
                    {selectedTopic === topic && (
                      <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">✓</Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="bg-sidebar-accent/50 rounded-lg p-3 border border-sidebar-border/50 space-y-2">
              <div className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <h3 className="text-xs font-semibold text-sidebar-foreground">{t("poweredBy")}</h3>
                  <p className="text-xs text-sidebar-foreground/70 leading-relaxed">
                    {t("poweredByDescription")}
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wide px-1">
                {t("features")}
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-xs text-sidebar-foreground/70 px-1">
                  <span className="text-primary mt-1 font-bold">✓</span>
                  <span>{t("verifiedSources")}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-sidebar-foreground/70 px-1">
                  <span className="text-primary mt-1 font-bold">✓</span>
                  <span>{t("multilingual")}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-sidebar-foreground/70 px-1">
                  <span className="text-primary mt-1 font-bold">✓</span>
                  <span>{t("contextAware")}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-sidebar-foreground/70 px-1">
                  <span className="text-primary mt-1 font-bold">✓</span>
                  <span>{t("realTimeAccuracy")}</span>
                </li>
              </ul>
            </div>

            {/* Privacy Note */}
            <div className="bg-sidebar-accent/30 rounded-lg p-3 border border-sidebar-border/50 space-y-2">
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-sidebar-foreground/60 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <h3 className="text-xs font-semibold text-sidebar-foreground">{t("privacy")}</h3>
                  <p className="text-xs text-sidebar-foreground/60 leading-relaxed">
                    {t("privacyDescription")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer - Sticky */}
        <div className="flex-shrink-0 p-4 border-t border-sidebar-border bg-sidebar">
          <p className="text-xs text-sidebar-foreground/50 break-all font-mono">
            {sessionId.substring(0, 16)}...
          </p>
          <p className="text-xs text-sidebar-foreground/40 mt-1">{t("sessionId")}</p>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  )
}
