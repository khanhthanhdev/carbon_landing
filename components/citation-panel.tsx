"use client"

import { Card } from "@/components/ui/card"
import { ExternalLink, FileText, BookOpen, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
interface Citation {
  id: number
  text?: string
  source: string
  page?: string
  url?: string
}

interface CitationPanelProps {
  citations: Citation[]
}

export function CitationPanel({ citations }: CitationPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const shouldTruncate = citations.length > 3 && !expanded
  const displayed = shouldTruncate ? citations.slice(0, 3) : citations
  return (
    <Card className="mt-3 p-3 bg-muted/30 border-l-4 border-l-primary">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3 w-3 text-primary" />
          <h4 className="text-xs font-semibold text-foreground">Sources</h4>
        </div>
        {citations.length > 3 && (
          <button
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Close
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Expand
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {displayed.map((citation) => (
          <div
            key={citation.id}
            className="flex items-center gap-2 p-2 bg-background rounded-md border border-border hover:border-primary/50 transition-colors text-xs"
          >
            <div className="flex-shrink-0">
              <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{citation.id}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground truncate" title={citation.source}>
                {citation.source}
              </p>
              {citation.page && (
                <p className="text-xs text-muted-foreground truncate" title={citation.page}>
                  {citation.page}
                </p>
              )}
            </div>
            {citation.url && (
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-primary hover:text-primary/80 transition-colors"
                title="View source"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
