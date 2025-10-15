"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MessageSquare, Info } from "lucide-react"
import { useTranslations } from "next-intl"

interface AIChatSidebarProps {
  isOpen: boolean
  onToggle: () => void
  sessionId: string
}

export function AIChatSidebar({
  isOpen,
  onToggle,
  sessionId,
}: AIChatSidebarProps) {
  const t = useTranslations()

  return (
    <>
      {/* Toggle button for mobile */}
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-24 z-40 lg:hidden bg-background"
        onClick={onToggle}
      >
        {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-30 w-80 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-0"
        }`}
      >
        <div className="h-full flex flex-col pt-16 lg:pt-0">
          {/* Header */}
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-sidebar-foreground">AI Assistant</h2>
            </div>
            <p className="text-xs text-sidebar-foreground/60">
              Ask questions about carbon markets and sustainability
            </p>
          </div>

          {/* Info Section */}
          <div className="flex-1 p-4 space-y-4">
            <div className="bg-sidebar-accent rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-sidebar-foreground">How it works</h3>
                  <p className="text-xs text-sidebar-foreground/70">
                    This AI assistant uses RAG (Retrieval-Augmented Generation) to provide accurate answers based on our carbon markets knowledge base.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-sidebar-foreground">Features</h3>
              <ul className="space-y-2 text-xs text-sidebar-foreground/70">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Answers based on verified sources</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Citations for transparency</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Multilingual support (EN/VI)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Context-aware responses</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-sidebar-border">
              <p className="text-xs text-sidebar-foreground/50">
                Session ID: {sessionId.substring(0, 20)}...
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onToggle} />}
    </>
  )
}
