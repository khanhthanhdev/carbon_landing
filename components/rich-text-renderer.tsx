"use client";

import { useMemo } from "react";
import { richTextToHtml } from "@/lib/rich-text";

interface RichTextRendererProps {
  className?: string;
  content: string;
}

export function RichTextRenderer({
  content,
  className = "",
}: RichTextRendererProps) {
  const renderedContent = useMemo(() => richTextToHtml(content), [content]);

  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}
