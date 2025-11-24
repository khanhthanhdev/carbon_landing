"use client"

import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react"
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Table,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  htmlTableToMarkdown,
  htmlToMarkdown,
  richTextToHtml,
  richTextToPlainText,
  tsvToMarkdownTable,
} from "@/lib/rich-text"

type RichTextEditorProps = {
  value: string
  onChange: (payload: { raw: string; html: string; text: string }) => void
  placeholder?: string
  className?: string
  helperText?: string
}

type SelectionRange = {
  start: number
  end: number
}

const ensureSelection = (textarea: HTMLTextAreaElement): SelectionRange => ({
  start: textarea.selectionStart ?? textarea.value.length,
  end: textarea.selectionEnd ?? textarea.value.length,
})

const setSelection = (textarea: HTMLTextAreaElement, start: number, end: number) => {
  requestAnimationFrame(() => {
    textarea.focus()
    textarea.setSelectionRange(start, end)
  })
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Type with Markdown or use the shortcuts below…",
  className,
  helperText,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [draft, setDraft] = useState<string>(() => htmlToMarkdown(value))

  useEffect(() => {
    const normalized = htmlToMarkdown(value)
    if (normalized !== draft) {
      setDraft(normalized)
    }
  }, [value, draft])

  const emitChange = (nextValue: string) => {
    const html = richTextToHtml(nextValue)
    const text = richTextToPlainText(nextValue)
    onChange({ raw: nextValue, html, text })
  }

  const updateDraft = (nextValue: string) => {
    setDraft(nextValue)
    emitChange(nextValue)
  }

  const wrapSelection = (prefix: string, suffix = prefix) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { value: currentValue } = textarea
    const { start, end } = ensureSelection(textarea)
    const selection = currentValue.slice(start, end) || "text"
    const nextValue = `${currentValue.slice(0, start)}${prefix}${selection}${suffix}${currentValue.slice(end)}`

    updateDraft(nextValue)
    const cursor = start + prefix.length
    setSelection(textarea, cursor, cursor + selection.length)
  }

  const insertSnippet = (snippet: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { value: currentValue } = textarea
    const { start, end } = ensureSelection(textarea)

    const nextValue = `${currentValue.slice(0, start)}${snippet}${currentValue.slice(end)}`
    updateDraft(nextValue)

    const cursor = start + snippet.length
    setSelection(textarea, cursor, cursor)
  }

  const addLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { value: currentValue } = textarea
    const { start, end } = ensureSelection(textarea)

    const before = currentValue.slice(0, start)
    const selection = currentValue.slice(start, end) || "text"
    const after = currentValue.slice(end)

    const selectionLines = selection.split("\n")
    const updatedSelection = selectionLines.map((line) => (line.trim() ? `${prefix}${line}` : line)).join("\n")

    const nextValue = `${before}${updatedSelection}${after}`
    updateDraft(nextValue)

    const cursorStart = start + prefix.length
    setSelection(textarea, cursorStart, cursorStart + updatedSelection.length - prefix.length)
  }

  const insertTableTemplate = () => {
    const template = ["| Column 1 | Column 2 |", "| --- | --- |", "| Value 1 | Value 2 |", ""].join("\n")
    insertSnippet(template)
  }

  const handleLink = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    const url = window.prompt("Enter URL")
    if (!url) return
    wrapSelection("[", `](${url})`)
  }

  const toolbarActions = [
    { label: "Bold", Icon: Bold, action: () => wrapSelection("**") },
    { label: "Italic", Icon: Italic, action: () => wrapSelection("*") },
    { label: "Code", Icon: Code, action: () => wrapSelection("`") },
    { label: "H1", Icon: Heading1, action: () => addLinePrefix("# ") },
    { label: "H2", Icon: Heading2, action: () => addLinePrefix("## ") },
    { label: "H3", Icon: Heading3, action: () => addLinePrefix("### ") },
    { label: "Bullet list", Icon: List, action: () => addLinePrefix("- ") },
    { label: "Numbered list", Icon: ListOrdered, action: () => addLinePrefix("1. ") },
    { label: "Quote", Icon: Quote, action: () => addLinePrefix("> ") },
    { label: "Table", Icon: Table, action: insertTableTemplate },
    { label: "Link", Icon: LinkIcon, action: handleLink },
  ]

  const previewHtml = useMemo(() => richTextToHtml(draft), [draft])

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const html = event.clipboardData.getData("text/html")
    const text = event.clipboardData.getData("text/plain")

    let markdown: string | null = null

    if (html && html.includes("<table")) {
      markdown = htmlTableToMarkdown(html)
    }

    if (!markdown && text && text.includes("\t")) {
      markdown = tsvToMarkdownTable(text)
    }

    if (!markdown) return

    event.preventDefault()
    const { value: currentValue } = textarea
    const { start, end } = ensureSelection(textarea)
    const nextValue = `${currentValue.slice(0, start)}${markdown}\n${currentValue.slice(end)}`
    setDraft(nextValue)
    emitChange(nextValue)
    const cursor = start + markdown.length + 1
    setSelection(textarea, cursor, cursor)
  }

  return (
    <div className={cn("rounded-lg border bg-background shadow-sm overflow-hidden", className)}>
      <div className="flex flex-wrap gap-1 border-b bg-muted/40 p-2">
        {toolbarActions.map(({ label, Icon, action }) => (
          <Button
            key={label}
            type="button"
            size="sm"
            variant="ghost"
            onClick={action}
            className="h-8 px-2 text-xs"
          >
            <Icon className="h-4 w-4" />
            <span className="sr-only">{label}</span>
          </Button>
        ))}
      </div>

      <Textarea
        ref={textareaRef}
        value={draft}
        onChange={(event) => updateDraft(event.target.value)}
        onPaste={handlePaste}
        placeholder={placeholder}
        className="min-h-[320px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
      />

      <div className="border-t bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground mb-2">
          Live preview (matches the books page rendering)
        </p>
        <div
          className="rich-text-content prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
        {helperText && <p className="mt-3 text-xs text-muted-foreground">{helperText}</p>}
      </div>
    </div>
  )
}
