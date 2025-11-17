"use client"

import { useMemo } from "react"

interface RichTextRendererProps {
  content: string
  className?: string
}

const HTML_DETECTION_REGEX = /<\/?[a-z][\s\S]*>/i

const ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ENTITY_MAP[char] ?? char)
}

function applyInlineFormatting(text: string) {
  let formatted = text

  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  formatted = formatted.replace(/(^|[\s(])\*([^*]+)\*/g, (_match, prefix, value) => `${prefix}<em>${value}</em>`)
  formatted = formatted.replace(/`([^`]+)`/g, "<code class=\"px-1 py-0.5 rounded bg-muted font-mono text-sm\">$1</code>")

  return formatted
}

function transformInline(text: string) {
  const links: Array<{ label: string; url: string }> = []

  let working = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    links.push({ label, url })
    return `__LINK_PLACEHOLDER_${links.length - 1}__`
  })

  // Remove footnote references
  working = working.replace(/\[\[.*?\]\]\(#footnote-.*?\)/g, '')

  working = escapeHtml(working)
  working = applyInlineFormatting(working)

  working = working.replace(/__LINK_PLACEHOLDER_(\d+)__/g, (_match, index) => {
    const { label, url } = links[Number(index)]
    const safeLabel = applyInlineFormatting(escapeHtml(label))
    const safeUrl = escapeHtml(url.trim())
    const isSafeProtocol = /^https?:\/\//i.test(url.trim())
    const href = isSafeProtocol ? safeUrl : "#"

    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">${safeLabel}</a>`
  })

  return working
}

function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")
  let html = ""
  let currentList: "ul" | "ol" | null = null
  let paragraphBuffer: string[] = []
  const totalLines = lines.length

  const isPotentialTableRow = (line: string) => {
    if (!line.startsWith("|")) return false
    const pipeCount = line.split("|").length - 1
    return pipeCount >= 2
  }

  const isSeparatorRow = (line: string) => {
    const cells = line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim())

    if (cells.length === 0) {
      return false
    }

    return cells.every((cell) => /^:?-{3,}:?$/.test(cell))
  }

  const parseAlignment = (line: string, columnCount: number) => {
    const cells = line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim())

    return Array.from({ length: columnCount }).map((_, index) => {
      const cell = cells[index] ?? ""
      const startsWithColon = cell.startsWith(":")
      const endsWithColon = cell.endsWith(":")

      if (startsWithColon && endsWithColon) return "text-center"
      if (endsWithColon) return "text-right"
      return "text-left"
    })
  }

  const splitTableRow = (line: string) =>
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => transformInline(cell.trim()))

  const renderTable = (startIndex: number) => {
    const tableLines: string[] = []
    let index = startIndex

    while (index < totalLines) {
      const rawLine = lines[index]
      const trimmedLine = rawLine.trim()

      if (trimmedLine === "" || !isPotentialTableRow(trimmedLine)) {
        break
      }

      tableLines.push(trimmedLine)
      index++
    }

    if (tableLines.length < 2) {
      return null
    }

    const [headerLine, separatorLine, ...dataLines] = tableLines

    if (!isSeparatorRow(separatorLine)) {
      return null
    }

    const headerCells = splitTableRow(headerLine)
    const alignments = parseAlignment(separatorLine, headerCells.length)
    const bodyRows = dataLines
      .map((row) => splitTableRow(row))
      .filter((row) => row.some((cell) => cell.trim().length > 0))
      .map((row) => {
        if (row.length < headerCells.length) {
          return [...row, ...Array(headerCells.length - row.length).fill("")]
        }
        if (row.length > headerCells.length) {
          return row.slice(0, headerCells.length)
        }
        return row
      })

    const headerHtml = `<thead><tr>${headerCells
      .map((cell, index) => {
        const alignClass = alignments[index] ?? "text-left"
        return `<th class="border border-border bg-muted/60 px-3 py-2 font-semibold ${alignClass}">${cell}</th>`
      })
      .join("")}</tr></thead>`

    const bodyHtml = bodyRows.length
      ? `<tbody>${bodyRows
          .map(
            (row) =>
              `<tr>${row
                .map((cell, cellIndex) => {
                  const alignClass = alignments[cellIndex] ?? "text-left"
                  return `<td class="border border-border px-3 py-2 align-top ${alignClass}">${cell}</td>`
                })
                .join("")}</tr>`,
          )
          .join("")}</tbody>`
      : ""

    return {
      html: `<div class="overflow-x-auto"><table class="w-full border-collapse text-sm">${headerHtml}${bodyHtml}</table></div>`,
      nextIndex: startIndex + tableLines.length,
    }
  }

  const closeList = () => {
    if (currentList === "ul") {
      html += "</ul>"
    } else if (currentList === "ol") {
      html += "</ol>"
    }
    currentList = null
  }

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const text = paragraphBuffer.join(" ")
      html += `<p>${transformInline(text)}</p>`
      paragraphBuffer = []
    }
  }

  for (let index = 0; index < totalLines; index++) {
    const rawLine = lines[index]
    const line = rawLine.replace(/\s+$/, "")
    const trimmed = line.trim()

    if (trimmed === "") {
      flushParagraph()
      closeList()
      continue
    }

    if (isPotentialTableRow(trimmed)) {
      const tableResult = renderTable(index)
      if (tableResult) {
        flushParagraph()
        closeList()
        html += tableResult.html
        index = tableResult.nextIndex - 1
        continue
      }
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      flushParagraph()
      closeList()
      const level = headingMatch[1].length
      const headingText = transformInline(headingMatch[2])
      html += `<h${level}>${headingText}</h${level}>`
      continue
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/)
    if (unorderedMatch) {
      flushParagraph()
      if (currentList !== "ul") {
        closeList()
        html += "<ul>"
        currentList = "ul"
      }
      html += `<li>${transformInline(unorderedMatch[1])}</li>`
      continue
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/)
    if (orderedMatch) {
      flushParagraph()
      if (currentList !== "ol") {
        closeList()
        html += "<ol>"
        currentList = "ol"
      }
      html += `<li>${transformInline(orderedMatch[1])}</li>`
      continue
    }

    const blockquoteMatch = trimmed.match(/^>\s?(.*)$/)
    if (blockquoteMatch) {
      flushParagraph()
      closeList()
      html += `<blockquote class="border-l-2 border-primary/40 pl-4 italic text-muted-foreground">${transformInline(blockquoteMatch[1])}</blockquote>`
      continue
    }

    paragraphBuffer.push(rawLine)
  }

  flushParagraph()
  closeList()

  return html
}

function normalizeContent(content: string) {
  if (!content) {
    return ""
  }

  const trimmed = content.trim()

  if (HTML_DETECTION_REGEX.test(trimmed)) {
    return trimmed
  }

  return markdownToHtml(trimmed)
}

export function RichTextRenderer({ content, className = "" }: RichTextRendererProps) {
  const renderedContent = useMemo(() => normalizeContent(content), [content])

  return <div className={`rich-text-content ${className}`} dangerouslySetInnerHTML={{ __html: renderedContent }} />
}
