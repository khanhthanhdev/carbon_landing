"use client";

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
} from "lucide-react";
import {
  type ClipboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  htmlTableToMarkdown,
  htmlToMarkdown,
  richTextToHtml,
  richTextToPlainText,
  tsvToMarkdownTable,
} from "@/lib/rich-text";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (payload: { raw: string; html: string; text: string }) => void;
  placeholder?: string;
  className?: string;
  helperText?: string;
};

type SelectionRange = {
  start: number;
  end: number;
};

const ensureSelection = (textarea: HTMLTextAreaElement): SelectionRange => ({
  start: textarea.selectionStart ?? textarea.value.length,
  end: textarea.selectionEnd ?? textarea.value.length,
});

const setSelection = (
  textarea: HTMLTextAreaElement,
  start: number,
  end: number
) => {
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start, end);
  });
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Type with Markdown or use the shortcuts below…",
  className,
  helperText,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [draft, setDraft] = useState<string>(() => htmlToMarkdown(value));

  useEffect(() => {
    const normalized = htmlToMarkdown(value);
    if (normalized !== draft) {
      setDraft(normalized);
    }
  }, [value, draft]);

  const emitChange = (nextValue: string) => {
    const html = richTextToHtml(nextValue);
    const text = richTextToPlainText(nextValue);
    onChange({ raw: nextValue, html, text });
  };

  const updateDraft = (nextValue: string) => {
    setDraft(nextValue);
    emitChange(nextValue);
  };

  const wrapSelection = (prefix: string, suffix = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const { value: currentValue } = textarea;
    const { start, end } = ensureSelection(textarea);
    const selection = currentValue.slice(start, end) || "text";
    const nextValue = `${currentValue.slice(0, start)}${prefix}${selection}${suffix}${currentValue.slice(end)}`;

    updateDraft(nextValue);
    const cursor = start + prefix.length;
    setSelection(textarea, cursor, cursor + selection.length);
  };

  const insertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const { value: currentValue } = textarea;
    const { start, end } = ensureSelection(textarea);

    const nextValue = `${currentValue.slice(0, start)}${snippet}${currentValue.slice(end)}`;
    updateDraft(nextValue);

    const cursor = start + snippet.length;
    setSelection(textarea, cursor, cursor);
  };

  const addLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const { value: currentValue } = textarea;
    const { start, end } = ensureSelection(textarea);

    const before = currentValue.slice(0, start);
    const selection = currentValue.slice(start, end) || "text";
    const after = currentValue.slice(end);

    const selectionLines = selection.split("\n");
    const updatedSelection = selectionLines
      .map((line) => (line.trim() ? `${prefix}${line}` : line))
      .join("\n");

    const nextValue = `${before}${updatedSelection}${after}`;
    updateDraft(nextValue);

    const cursorStart = start + prefix.length;
    setSelection(
      textarea,
      cursorStart,
      cursorStart + updatedSelection.length - prefix.length
    );
  };

  const insertTableTemplate = () => {
    const template = [
      "| Column 1 | Column 2 |",
      "| --- | --- |",
      "| Value 1 | Value 2 |",
      "",
    ].join("\n");
    insertSnippet(template);
  };

  const handleLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const url = window.prompt("Enter URL");
    if (!url) {
      return;
    }
    wrapSelection("[", `](${url})`);
  };

  const toolbarActions = [
    { label: "Bold", Icon: Bold, action: () => wrapSelection("**") },
    { label: "Italic", Icon: Italic, action: () => wrapSelection("*") },
    { label: "Code", Icon: Code, action: () => wrapSelection("`") },
    { label: "H1", Icon: Heading1, action: () => addLinePrefix("# ") },
    { label: "H2", Icon: Heading2, action: () => addLinePrefix("## ") },
    { label: "H3", Icon: Heading3, action: () => addLinePrefix("### ") },
    { label: "Bullet list", Icon: List, action: () => addLinePrefix("- ") },
    {
      label: "Numbered list",
      Icon: ListOrdered,
      action: () => addLinePrefix("1. "),
    },
    { label: "Quote", Icon: Quote, action: () => addLinePrefix("> ") },
    { label: "Table", Icon: Table, action: insertTableTemplate },
    { label: "Link", Icon: LinkIcon, action: handleLink },
  ];

  const previewHtml = useMemo(() => richTextToHtml(draft), [draft]);

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");

    let markdown: string | null = null;

    // Priority 1: HTML tables (preserve existing behavior)
    if (html && html.includes("<table")) {
      markdown = htmlTableToMarkdown(html);
    }

    // Priority 2: TSV data (preserve existing behavior)
    if (!markdown && text && text.includes("\t")) {
      markdown = tsvToMarkdownTable(text);
    }

    // Priority 3: General HTML content (new - for Word/Excel/Docs formatting)
    if (!markdown && html && /<\/?[a-z][\s\S]*>/i.test(html.trim())) {
      const converted = htmlToMarkdown(html);
      // Only use converted markdown if it's different from plain text (has formatting)
      // This prevents converting plain text that happens to have HTML wrapper tags
      if (converted && converted.trim() && converted !== text.trim()) {
        markdown = converted;
      }
    }

    // If we have markdown to insert, prevent default paste and insert it
    if (markdown) {
      event.preventDefault();
      const { value: currentValue } = textarea;
      const { start, end } = ensureSelection(textarea);
      const nextValue = `${currentValue.slice(0, start)}${markdown}${currentValue.slice(end)}`;
      setDraft(nextValue);
      emitChange(nextValue);
      const cursor = start + markdown.length;
      setSelection(textarea, cursor, cursor);
    }
    // Otherwise, let default paste behavior happen (plain text)
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-background shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap gap-1 border-b bg-muted/40 p-2">
        {toolbarActions.map(({ label, Icon, action }) => (
          <Button
            className="h-8 px-2 text-xs"
            key={label}
            onClick={action}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Icon className="h-4 w-4" />
            <span className="sr-only">{label}</span>
          </Button>
        ))}
      </div>

      <Textarea
        className="min-h-[320px] resize-none border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
        onChange={(event) => updateDraft(event.target.value)}
        onPaste={handlePaste}
        placeholder={placeholder}
        ref={textareaRef}
        value={draft}
      />

      <div className="border-t bg-muted/20 p-4">
        <p className="mb-2 text-muted-foreground text-xs">
          Live preview (matches the books page rendering)
        </p>
        <div
          className="rich-text-content prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
        {helperText && (
          <p className="mt-3 text-muted-foreground text-xs">{helperText}</p>
        )}
      </div>
    </div>
  );
}
