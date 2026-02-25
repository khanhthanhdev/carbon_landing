const HTML_DETECTION_REGEX = /<\/?[a-z][\s\S]*>/i;

const ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const DECODE_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

const DECODER =
  typeof window !== "undefined" ? document.createElement("textarea") : null;

const decodeCodePoint = (value: number, fallback: string) => {
  if (!Number.isInteger(value) || value < 0 || value > 0x10_ff_ff) {
    return fallback;
  }

  try {
    return String.fromCodePoint(value);
  } catch {
    return fallback;
  }
};

const decodeEntities = (value: string) => {
  if (!value.includes("&")) {
    return value;
  }

  if (!DECODER) {
    return value.replace(
      /&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);/gi,
      (entity, token: string) => {
        const normalizedToken = token.toLowerCase();

        if (normalizedToken.startsWith("#x")) {
          const codePoint = Number.parseInt(normalizedToken.slice(2), 16);
          return decodeCodePoint(codePoint, entity);
        }

        if (normalizedToken.startsWith("#")) {
          const codePoint = Number.parseInt(normalizedToken.slice(1), 10);
          return decodeCodePoint(codePoint, entity);
        }

        return DECODE_ENTITY_MAP[normalizedToken] ?? entity;
      }
    );
  }

  DECODER.innerHTML = value;
  return DECODER.value;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ENTITY_MAP[char] ?? char);

const applyInlineFormatting = (text: string) => {
  let formatted = text;

  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(
    /(^|[\s(])\*([^*]+)\*/g,
    (_match, prefix, value) => `${prefix}<em>${value}</em>`
  );
  formatted = formatted.replace(
    /`([^`]+)`/g,
    '<code class="px-1 py-0.5 rounded bg-muted font-mono text-sm">$1</code>'
  );

  return formatted;
};

const transformInline = (text: string) => {
  const links: Array<{ label: string; url: string }> = [];

  let working = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label, url) => {
      links.push({ label, url });
      return `__LINK_PLACEHOLDER_${links.length - 1}__`;
    }
  );

  // Remove footnote references
  working = working.replace(/\[\[.*?\]\]\(#footnote-.*?\)/g, "");

  working = decodeEntities(working);
  working = escapeHtml(working);
  working = applyInlineFormatting(working);

  working = working.replace(/__LINK_PLACEHOLDER_(\d+)__/g, (_match, index) => {
    const { label, url } = links[Number(index)];
    const safeLabel = applyInlineFormatting(escapeHtml(decodeEntities(label)));
    const normalizedUrl = decodeEntities(url.trim());
    const safeUrl = escapeHtml(normalizedUrl);
    const isSafeProtocol = /^https?:\/\//i.test(normalizedUrl);
    const href = isSafeProtocol ? safeUrl : "#";

    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">${safeLabel}</a>`;
  });

  return working;
};

const markdownToHtml = (markdown: string) => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let currentList: "ul" | "ol" | null = null;
  let paragraphBuffer: string[] = [];
  let previousTrimmedLine = "";
  const totalLines = lines.length;

  const getTableParts = (line: string) => {
    const firstPipeIndex = line.indexOf("|");
    if (firstPipeIndex < 0) {
      return null;
    }

    const prefix = line.slice(0, firstPipeIndex).trim();
    if (prefix.length > 0 && !prefix.endsWith(":")) {
      return null;
    }

    const table = line.slice(firstPipeIndex).trim();
    return {
      prefix,
      table,
    };
  };

  const expandCompactTableRows = (tableLine: string) =>
    tableLine
      .replace(/\|\s+\|/g, "|\n|")
      .split("\n")
      .map((row) => row.trim())
      .filter((row) => row.length > 0);

  const isPotentialTableRow = (line: string) => {
    const tableParts = getTableParts(line);
    if (!tableParts) {
      return false;
    }

    const pipeCount = tableParts.table.split("|").length - 1;
    return pipeCount >= 2;
  };

  const isSeparatorRow = (line: string) => {
    const cells = line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

    if (cells.length === 0) {
      return false;
    }

    return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
  };

  const parseAlignment = (line: string, columnCount: number) => {
    const cells = line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

    return Array.from({ length: columnCount }).map((_, index) => {
      const cell = cells[index] ?? "";
      const startsWithColon = cell.startsWith(":");
      const endsWithColon = cell.endsWith(":");

      if (startsWithColon && endsWithColon) {
        return "text-center";
      }
      if (endsWithColon) {
        return "text-right";
      }
      return "text-left";
    });
  };

  const splitTableRow = (line: string) =>
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => transformInline(cell.trim()));

  const renderTable = (startIndex: number) => {
    const tableLines: string[] = [];
    let leadingLabel = "";
    let index = startIndex;

    while (index < totalLines) {
      const rawLine = lines[index];
      const trimmedLine = rawLine.trim();

      if (trimmedLine === "" || !isPotentialTableRow(trimmedLine)) {
        break;
      }

      const tableParts = getTableParts(trimmedLine);
      if (!tableParts) {
        break;
      }

      if (index === startIndex && tableParts.prefix.length > 0) {
        leadingLabel = tableParts.prefix;
      }

      const expandedRows = expandCompactTableRows(tableParts.table);
      tableLines.push(...expandedRows);
      index++;
    }

    if (tableLines.length < 2) {
      return null;
    }

    const [headerLine, separatorLine, ...dataLines] = tableLines;

    if (!isSeparatorRow(separatorLine)) {
      return null;
    }

    const headerCells = splitTableRow(headerLine);
    const alignments = parseAlignment(separatorLine, headerCells.length);
    const bodyRows = dataLines
      .map((row) => splitTableRow(row))
      .filter((row) => row.some((cell) => cell.trim().length > 0))
      .map((row) => {
        if (row.length < headerCells.length) {
          return [...row, ...Array(headerCells.length - row.length).fill("")];
        }
        if (row.length > headerCells.length) {
          return row.slice(0, headerCells.length);
        }
        return row;
      });

    const headerHtml = `<thead><tr>${headerCells
      .map((cell, index) => {
        const alignClass = alignments[index] ?? "text-left";
        return `<th class="border border-border bg-muted/60 px-3 py-2 font-semibold ${alignClass}">${cell}</th>`;
      })
      .join("")}</tr></thead>`;

    const bodyHtml = bodyRows.length
      ? `<tbody>${bodyRows
          .map(
            (row) =>
              `<tr>${row
                .map((cell, cellIndex) => {
                  const alignClass = alignments[cellIndex] ?? "text-left";
                  return `<td class="border border-border px-3 py-2 align-top ${alignClass}">${cell}</td>`;
                })
                .join("")}</tr>`
          )
          .join("")}</tbody>`
      : "";

    const labelHtml = leadingLabel
      ? `<p>${transformInline(leadingLabel)}</p>`
      : "";

    return {
      html: `${labelHtml}<div class="overflow-x-auto"><table class="w-full border-collapse text-sm">${headerHtml}${bodyHtml}</table></div>`,
      nextIndex: index,
    };
  };

  const closeList = () => {
    if (currentList === "ul") {
      html += "</ul>";
    } else if (currentList === "ol") {
      html += "</ol>";
    }
    currentList = null;
  };

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const text = paragraphBuffer.join(" ");
      html += `<p>${transformInline(text)}</p>`;
      paragraphBuffer = [];
    }
  };

  const normalizeParagraphLine = (inputLine: string) => {
    const leadingWhitespaceMatch = inputLine.match(/^(\s*)/);
    const leadingWhitespace = leadingWhitespaceMatch?.[1] ?? "";
    const trimmedStart = inputLine.trimStart();
    let normalizedLine = inputLine;

    // Strip malformed heading markers such as "####: Text" or "###Text".
    if (/^#{1,6}(?!\s)/.test(trimmedStart)) {
      const strippedPrefix = trimmedStart.replace(/^#{1,6}\s*:?\s*/, "");
      if (strippedPrefix.length > 0) {
        normalizedLine = `${leadingWhitespace}${strippedPrefix}`;
      }
    }

    // Strip inline heading markers after punctuation labels, e.g. "Answer: ### Title".
    normalizedLine = normalizedLine.replace(
      /([:?!.]\s+)#{1,6}\s+(?=\S)/g,
      "$1"
    );

    return normalizedLine;
  };

  for (let index = 0; index < totalLines; index++) {
    const rawLine = lines[index];
    const line = rawLine.replace(/\s+$/, "");
    const trimmed = line.trim();

    if (trimmed === "") {
      flushParagraph();
      closeList();
      previousTrimmedLine = "";
      continue;
    }

    if (isPotentialTableRow(trimmed)) {
      const tableResult = renderTable(index);
      if (tableResult) {
        flushParagraph();
        closeList();
        html += tableResult.html;
        index = tableResult.nextIndex - 1;
        previousTrimmedLine = "";
        continue;
      }
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    const previousLineEndsWithColon = previousTrimmedLine.endsWith(":");
    if (headingMatch && !previousLineEndsWithColon) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      const headingText = transformInline(headingMatch[2]);
      html += `<h${level}>${headingText}</h${level}>`;
      previousTrimmedLine = trimmed;
      continue;
    }
    if (headingMatch && previousLineEndsWithColon) {
      paragraphBuffer.push(headingMatch[2]);
      previousTrimmedLine = headingMatch[2].trim();
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (currentList !== "ul") {
        closeList();
        html += "<ul>";
        currentList = "ul";
      }
      html += `<li>${transformInline(unorderedMatch[1])}</li>`;
      previousTrimmedLine = trimmed;
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (currentList !== "ol") {
        closeList();
        html += "<ol>";
        currentList = "ol";
      }
      html += `<li>${transformInline(orderedMatch[1])}</li>`;
      previousTrimmedLine = trimmed;
      continue;
    }

    const blockquoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      flushParagraph();
      closeList();
      html += `<blockquote class="border-l-2 border-primary/40 pl-4 italic text-muted-foreground">${transformInline(blockquoteMatch[1])}</blockquote>`;
      previousTrimmedLine = trimmed;
      continue;
    }

    paragraphBuffer.push(normalizeParagraphLine(rawLine));
    previousTrimmedLine = trimmed;
  }

  flushParagraph();
  closeList();

  return html;
};

export const richTextToHtml = (content: string) => {
  if (!content) {
    return "";
  }

  const trimmed = content.trim();

  if (HTML_DETECTION_REGEX.test(trimmed)) {
    return trimmed;
  }

  return markdownToHtml(trimmed);
};

export const richTextToPlainText = (content: string) => {
  const html = richTextToHtml(content);
  if (!html) {
    return "";
  }

  if (typeof window === "undefined") {
    return decodeEntities(html.replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
  }

  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? div.innerText ?? "").replace(/\s+/g, " ").trim();
};

export const htmlToMarkdown = (html: string) => {
  if (!(html && HTML_DETECTION_REGEX.test(html.trim()))) {
    return html ?? "";
  }

  if (typeof window === "undefined") {
    return html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const tableToMarkdown = (table: HTMLTableElement) => {
    const rows = Array.from(table.rows).map((row) =>
      Array.from(row.cells).map((cell) => serializeNode(cell).trim())
    );

    if (!rows.length) {
      return "";
    }

    const header = rows[0]!.map((value) => value || " ");
    const separator = header.map(() => "---");
    const body = rows.slice(1).map((r) => r.map((value) => value || " "));

    const headerRow = `| ${header.join(" | ")} |`;
    const separatorRow = `| ${separator.join(" | ")} |`;
    const bodyRows = body.map((r) => `| ${r.join(" | ")} |`).join("\n");

    return (
      [headerRow, separatorRow, bodyRows].filter(Boolean).join("\n").trimEnd() +
      "\n\n"
    );
  };

  const serializeNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? "").replace(/\s+/g, " ");
    }

    if (!(node instanceof HTMLElement)) {
      return "";
    }

    const tag = node.tagName.toLowerCase();

    // Check for inline styles
    const style = node.style;
    const fontWeight = style.fontWeight;
    const fontStyle = style.fontStyle;
    const textDecoration = style.textDecoration;

    const isBold = fontWeight === "bold" || Number.parseInt(fontWeight) >= 600;
    const isItalic = fontStyle === "italic";

    // Helper to apply styles to text
    const applyStyles = (text: string) => {
      let result = text;

      // Avoid double wrapping if possible (naive check)
      // We only wrap if it's not strictly block-level content that shouldn't be wrapped?
      // Actually, we just wrap. inner redundancy (****) can be cleaned up later if needed.

      // Clean up extra spaces which break markdown formatting
      // Move spaces outside: "** text **" -> " **text** "
      result = result
        .replace(/^(\s+)(.+?)(\s+)$/, "$1**$2**$3")
        .replace(/^(\s+)(.+)$/, "$1**$2**")
        .replace(/^(.+?)(\s+)$/, "**$1**$2");

      // If we didn't match the regexes above (no leading/trailing space), just wrap
      if (!result.includes("**") && isBold) {
        // Ensure we don't wrap if empty
        if (result.trim()) {
          result = `**${result}**`;
        }
      } else if (isBold && !/^\*\*.*\*\*$/.test(result.trim())) {
        // It might have inner bold, but we want to bold the whole thing?
        // This is complex. Let's stick to simple wrapping and rely on cleanup or renderer resilience.
        if (result.trim()) {
          result = `**${result}**`;
        }
      }

      if (isItalic && result.trim()) {
        result = `*${result}*`;
      }

      return result;
    };

    // Recursively serialize children first
    let children = Array.from(node.childNodes)
      .map((child) => serializeNode(child))
      .join("");

    // Clean up extra spaces around internal formatting hooks from children
    children = children
      .replace(/\s+(\*\*)|\s+(\*)/g, " $1$2")
      .replace(/(\*\*)\s+|(\*)\s+/g, "$1$2 ");

    switch (tag) {
      case "br":
        return "\n";
      case "p":
      case "div": {
        const className = node.className || "";
        // Word List Handling
        if (
          className.includes("MsoListParagraph") ||
          style.getPropertyValue("mso-list")
        ) {
          const trimmed = children.trim();
          let marker = "";
          let content = trimmed;

          // Try to extract marker from text stats
          const match = trimmed.match(/^(\d+\.|[a-zA-Z]\.|•|·|-)\s+([\s\S]*)$/);
          if (match) {
            marker = match[1];
            content = match[2];
          } else if (/^(\d+\.|[a-zA-Z]\.|•|·|-)\s*$/.test(trimmed)) {
            // Just a marker?
            marker = trimmed;
            content = "";
          } else {
            // Fallback: No visible marker in text, check for implicit
            // We'll use a bullet as default if we can't find one.
            marker = "-";
            content = trimmed;
          }

          // Apply styles ONLY to the content, not the marker
          const styledContent = applyStyles(content);

          return `${marker} ${styledContent}\n\n`;
        }

        // Normal Paragraph/Div
        // Apply styles to the whole content
        const styled = applyStyles(children);
        return styled.trim() ? `${styled}\n\n` : "";
      }
      case "strong":
      case "b":
        return `**${children.trim()}**`;
      case "em":
      case "i":
        return `*${children.trim()}*`;
      case "u":
        return children.trim();
      case "code":
        return node.parentElement?.tagName.toLowerCase() === "pre"
          ? children
          : `\`${children}\``;
      case "pre":
        return `\`\`\`\n${node.textContent?.trim() ?? ""}\n\`\`\`\n\n`;
      case "h1":
        return `# ${children.trim()}\n\n`;
      case "h2":
        return `## ${children.trim()}\n\n`;
      case "h3":
        return `### ${children.trim()}\n\n`;
      case "h4":
        return `#### ${children.trim()}\n\n`;
      case "h5":
        return `##### ${children.trim()}\n\n`;
      case "h6":
        return `###### ${children.trim()}\n\n`;
      case "blockquote":
        return children
          .split("\n")
          .map((line) => (line.trim() ? `> ${line.trim()}` : ""))
          .join("\n")
          .concat("\n\n");
      case "a": {
        const href = node.getAttribute("href") ?? "";
        return `[${applyStyles(children.trim()) || href}](${href})`;
      }
      case "ul":
        return Array.from(node.children)
          .map((child) => `- ${serializeNode(child).trim()}`)
          .join("\n")
          .concat("\n\n");
      case "ol":
        return Array.from(node.children)
          .map((child, index) => `${index + 1}. ${serializeNode(child).trim()}`)
          .join("\n")
          .concat("\n\n");
      case "li":
        // LI usually doesn't have bold style on the LI tag itself, but if it does:
        return applyStyles(children.trim());
      case "table":
        return tableToMarkdown(node as HTMLTableElement);
      case "span":
        return applyStyles(children);
      default:
        // Generic container, apply styles if present (e.g. <font>)
        return applyStyles(children);
    }
  };

  const result = serializeNode(doc.body)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return result;
};

export const htmlTableToMarkdown = (html: string) => {
  if (!(html && HTML_DETECTION_REGEX.test(html))) {
    return null;
  }
  if (typeof window === "undefined") {
    return null;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) {
    return null;
  }

  return htmlToMarkdown(table.outerHTML);
};

export const tsvToMarkdownTable = (text: string) => {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split("\t").map((cell) => cell.trim()))
    .filter((row) => row.length);

  if (rows.length < 2) {
    return null;
  }

  const header = rows[0]!;
  const separator = header.map(() => "---");
  const body = rows.slice(1);

  const headerRow = `| ${header.join(" | ")} |`;
  const separatorRow = `| ${separator.join(" | ")} |`;
  const bodyRows = body.map((r) => `| ${r.join(" | ")} |`).join("\n");

  return [headerRow, separatorRow, bodyRows]
    .filter(Boolean)
    .join("\n")
    .trimEnd();
};
