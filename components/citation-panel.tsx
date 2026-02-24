"use client";

import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";

interface Citation {
  id: number;
  page?: string;
  source: string;
  text?: string;
  url?: string;
}

interface CitationPanelProps {
  citations: Citation[];
}

export function CitationPanel({ citations }: CitationPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = citations.length > 3 && !expanded;
  const displayed = shouldTruncate ? citations.slice(0, 3) : citations;
  return (
    <Card className="mt-3 border-l-4 border-l-primary bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3 w-3 text-primary" />
          <h4 className="font-semibold text-foreground text-xs">Sources</h4>
        </div>
        {citations.length > 3 && (
          <button
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
            onClick={() => setExpanded(!expanded)}
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {displayed.map((citation) => (
          <div
            className="flex items-center gap-2 rounded-md border border-border bg-background p-2 text-xs transition-colors hover:border-primary/50"
            key={citation.id}
          >
            <div className="flex-shrink-0">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20">
                <span className="font-bold text-primary text-xs">
                  {citation.id}
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-foreground text-xs"
                title={citation.source}
              >
                {citation.source}
              </p>
              {citation.page && (
                <p
                  className="truncate text-muted-foreground text-xs"
                  title={citation.page}
                >
                  {citation.page}
                </p>
              )}
            </div>
            {citation.url && (
              <a
                className="flex-shrink-0 text-primary transition-colors hover:text-primary/80"
                href={citation.url}
                rel="noopener noreferrer"
                target="_blank"
                title="View source"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
