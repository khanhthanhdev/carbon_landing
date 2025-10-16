"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, User, ThumbsUp, MessageSquareQuote, ExternalLink, FileText, Copy, Edit3, Check, X } from "lucide-react"
import { CitationPanel } from "@/components/citation-panel"
import { ChatFeedback } from "@/components/chat-feedback"
import { RichTextRenderer } from "@/components/rich-text-renderer"
import { useTranslations } from "next-intl"

// Import markdown processing functions
const HTML_DETECTION_REGEX = /<\/?[a-z][\s\S]*>/i

function markdownToHtml(markdown: string) {
  // Simplified markdown processing - just handle basic formatting
  let html = markdown
  
  // Handle bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // Handle italic
  html = html.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>')
  
  // Handle code
  html = html.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted font-mono text-sm">$1</code>')
  
  // Handle links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">$1</a>')
  
  // Handle line breaks
  html = html.replace(/\n/g, '<br>')
  
  return html
}

function normalizeContent(content: string) {
  if (!content) return ""
  
  const trimmed = content.trim()
  
  if (HTML_DETECTION_REGEX.test(trimmed)) {
    return trimmed
  }
  
  return markdownToHtml(trimmed)
}

interface Citation {
  id: number
  text: string
  source: string
  page?: string
  url?: string
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  citations?: Citation[]
  feedback?: {
    rating: number
    comment: string
  }
}

interface AIMessageWithCitationsProps {
  message: Message
  onFeedback: (messageId: string, rating: number, comment: string) => void
  onReference: (message: Message) => void
}

export default function AIMessageWithCitations({ message, onFeedback, onReference }: AIMessageWithCitationsProps) {
  const [showCitations, setShowCitations] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [tooltipCitation, setTooltipCitation] = useState<Citation | null>(null)
  const t = useTranslations("aiChat.messages")

  // Parse content to highlight citations with colored markers
  const renderContentWithCitations = (content: string) => {
    if (!message.citations || message.citations.length === 0) {
      return <RichTextRenderer content={content} className="text-sm leading-relaxed" />
    }

    // Process markdown first
    const htmlContent = normalizeContent(content)
    
    // Replace [Source X] with inline citation markers
    let processedContent = htmlContent.replace(/\[Source (\d+)\]/g, (match, citationId) => {
      const id = parseInt(citationId)
      const citation = message.citations?.find(c => c.id === id)
      if (citation) {
        return `<span class="citation-marker inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-semibold mx-0.5 cursor-pointer hover:bg-primary/30 transition-colors" data-citation-id="${id}">${id}</span>`
      }
      return match // Keep original if citation not found
    })

    return (
      <div className="text-sm leading-relaxed">
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: processedContent }}
          onMouseMove={(e) => {
            // Use closest to allow child elements inside the marker
            const target = (e.target as HTMLElement).closest('.citation-marker') as HTMLElement | null
            if (target && target.getAttribute) {
              const citationId = parseInt(target.getAttribute('data-citation-id') || '0')
              const citation = message.citations?.find(c => c.id === citationId)
              if (citation) {
                const rect = target.getBoundingClientRect()
                setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 })
                setTooltipCitation(citation)
                return
              }
            }

            // If we're not over a citation marker, hide the tooltip
            setTooltipCitation(null)
          }}
          onMouseLeave={() => {
            // Hide tooltip when leaving the container entirely
            setTooltipCitation(null)
          }}
        />
      </div>
    )
  }

  if (message.role === "user") {
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState(message.content)

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(message.content)
        // You could add a toast notification here
      } catch (err) {
        console.error('Failed to copy text: ', err)
      }
    }

    const handleEdit = () => {
      setIsEditing(true)
      setEditContent(message.content)
    }

    const handleSaveEdit = () => {
      // For now, just update the local state. In a real app, you'd send this to the backend
      setIsEditing(false)
      // You could call an onEdit callback here if needed
    }

    const handleCancelEdit = () => {
      setIsEditing(false)
      setEditContent(message.content)
    }

    return (
      <div className="flex gap-3 justify-end group">
        <div className="flex flex-col items-end gap-1 max-w-[80%]">
          <Card className="bg-primary text-primary-foreground px-3 py-2 rounded-2xl rounded-tr-sm relative shadow-sm">
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-primary-foreground/10 text-primary-foreground rounded-lg px-2 py-1 text-sm resize-none min-h-[40px] border border-primary-foreground/20 focus:outline-none focus:ring-1 focus:ring-primary-foreground/50"
                  rows={2}
                />
                <div className="flex gap-1 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    className="h-6 px-2 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {t("cancel")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    className="h-6 px-2 bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    {t("save")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            )}
          </Card>

          {/* Action buttons below the message */}
          {!isEditing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="h-6 px-2 text-muted-foreground hover:text-foreground hover:bg-muted text-xs"
                title={t("copyMessage")}
              >
                <Copy className="h-3 w-3 mr-1" />
                {t("copyMessage")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleEdit}
                className="h-6 px-2 text-muted-foreground hover:text-foreground hover:bg-muted text-xs"
                title={t("editMessage")}
              >
                <Edit3 className="h-3 w-3 mr-1" />
                {t("editMessage")}
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 justify-start">
      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 max-w-[85%]">
        <Card className="bg-card px-3 py-2 rounded-2xl rounded-tl-sm shadow-sm">
          <div className="prose prose-sm max-w-none">
            {renderContentWithCitations(message.content)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => onReference(message)}>
              <MessageSquareQuote className="h-3 w-3 mr-1" />
              Ask Follow-up
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setShowFeedback(!showFeedback)}>
              {message.feedback ? (
                <>
                  <ThumbsUp className="h-3 w-3 mr-1 fill-primary text-primary" />
                  Feedback Given
                </>
              ) : (
                <>
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Give Feedback
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Feedback Form */}
        {showFeedback && !message.feedback && (
          <ChatFeedback
            messageId={message.id}
            onSubmit={(rating, comment) => {
              onFeedback(message.id, rating, comment)
              setShowFeedback(false)
            }}
            onCancel={() => setShowFeedback(false)}
          />
        )}

        {/* Show existing feedback */}
        {message.feedback && (
          <Card className="mt-3 p-3 bg-muted/50">
            <p className="text-xs font-medium text-foreground mb-1">Your Feedback:</p>
            <div className="flex items-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-sm ${
                    star <= message.feedback!.rating ? "text-yellow-500" : "text-muted-foreground"
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            {message.feedback.comment && <p className="text-xs text-muted-foreground">{message.feedback.comment}</p>}
          </Card>
        )}

        {/* Citations Panel */}
        {message.citations && message.citations.length > 0 && <CitationPanel citations={message.citations} />}

        {/* Citation Tooltip */}
        {tooltipCitation && (
          <div 
            className="fixed z-50 bg-background border border-border rounded-lg shadow-lg p-3 w-64 pointer-events-none"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-primary" />
                <span className="font-semibold text-xs">Source {tooltipCitation.id}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{tooltipCitation.source}</p>
              </div>
              {tooltipCitation.page && (
                <div>
                  <p className="text-xs text-muted-foreground">{tooltipCitation.page}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground line-clamp-2">{tooltipCitation.text}</p>
              </div>
              {tooltipCitation.url && (
                <div className="pt-1">
                  <a
                    href={tooltipCitation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline pointer-events-auto"
                  >
                    View Source
                    <ExternalLink className="h-2 w-2" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
