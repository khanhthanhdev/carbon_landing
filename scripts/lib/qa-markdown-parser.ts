import natural from "natural";

export interface ParserOptions {
  category: string;
  keywordTopN: number;
  lang: string;
  nowIso: string;
}

export interface QuestionMetadata {
  answer_length: number;
  category: string;
  created_at: string;
  has_sources: boolean;
  keywords: string[];
  lang: string;
  question_number: string;
  section_id: string;
  section_number: string;
  section_title: string;
  updated_at: string;
}

export interface QuestionSearchFields {
  category_searchable: string;
  keywords_searchable: string;
  question_lower: string;
}

export interface ParsedQuestion {
  answer: string;
  id: string;
  metadata: QuestionMetadata;
  question: string;
  search_fields: QuestionSearchFields;
  searchable_text: string;
  sources: string[];
}

export interface ParsedSection {
  question_count: number;
  questions: ParsedQuestion[];
  section_id: string;
  section_number: string;
  section_title: string;
}

export interface ParsedMarkdown {
  sections: ParsedSection[];
  stats: {
    footnotes: number;
    questions: number;
    sections: number;
  };
}

export interface QAImportItem {
  answer: string;
  category: string;
  id: string;
  keywords: string[];
  lang: string;
  metadata: QuestionMetadata;
  question: string;
  question_number: string;
  search_fields: QuestionSearchFields;
  searchable_text: string;
  section_id: string;
  section_number: string;
  section_title: string;
  sources: string[];
}

interface MutableSection {
  questions: ParsedQuestion[];
  section_id: string;
  section_number: string;
  section_title: string;
}

interface MutableQuestion {
  id: string;
  question: string;
  questionNumber: string;
}

interface ParserState {
  answerLines: string[];
  currentQuestion: MutableQuestion | null;
  currentSection: MutableSection | null;
  questionIndex: number;
  sections: ParsedSection[];
  startedContent: boolean;
}

const DEFAULT_OPTIONS: Omit<ParserOptions, "nowIso"> = {
  category: "Carbon Market",
  keywordTopN: 10,
  lang: "en",
};

const FOOTNOTE_LINE_RE = /^(\d+)\.\s+(.+)\s+\[↑\]\(#footnote-ref-(\d+)\)\s*$/u;
const INLINE_FOOTNOTE_RE = /\[\[(\d+)\]\]\(#footnote-(\d+)\)/g;
const APPENDIX_RE = /^#\s*(?:APPENDIX|PHỤ LỤC)\b/iu;
const PART_RE = /^(?:#\s*)?(?:PART|PHẦN)\s+(\d+):\s+(.+)$/iu;
const QUESTION_HEADING_RE = /^#\s+(\d+)\.\s+(.+)$/u;
const SECTION_QUESTION_RE = /^##\s+(.+)$/u;
const QUESTION_NUMBER_RE = /^(\d+)\.\s+(.+)$/u;

const normalizeEol = (value: string): string => value.replace(/\r\n/g, "\n");

const toLocaleFromLang = (lang: string): string =>
  lang.toLocaleLowerCase("en-US") === "vi" ? "vi-VN" : "en-US";

const isVietnameseLang = (lang: string): boolean =>
  lang.toLocaleLowerCase("en-US") === "vi";

const toLowerCase = (value: string, locale: string): string =>
  value.toLocaleLowerCase(locale);

const stripTrailingHeadingArtifacts = (answer: string): string => {
  const lines = answer.split("\n");
  let end = lines.length;

  while (end > 0 && lines[end - 1]?.trim() === "") {
    end -= 1;
  }

  while (end > 0 && lines[end - 1]?.trim() === "#") {
    end -= 1;
  }

  while (end > 0 && lines[end - 1]?.trim() === "") {
    end -= 1;
  }

  return lines.slice(0, end).join("\n").trim();
};

const extractFootnotes = (lines: string[]): Map<string, string> => {
  const footnotes = new Map<string, string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(FOOTNOTE_LINE_RE);

    if (!match) {
      continue;
    }

    const anchorId = match[3];
    const sourceText = match[2]?.trim();

    if (anchorId && sourceText) {
      footnotes.set(anchorId, sourceText);
    }
  }

  return footnotes;
};

const fallbackKeywords = (
  text: string,
  topN: number,
  locale: string
): string[] => {
  const tokenMatches = text
    .toLocaleLowerCase(locale)
    .match(/\p{L}[\p{L}\p{N}_-]{1,}/gu);

  if (!tokenMatches) {
    return [];
  }

  const counts = new Map<string, number>();
  for (const token of tokenMatches) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, topN)
    .map(([token]) => token);
};

const extractKeywords = (
  text: string,
  topN: number,
  locale: string
): string[] => {
  if (locale === "vi-VN") {
    return fallbackKeywords(text, topN, locale);
  }

  try {
    const tfidf = new natural.TfIdf();
    tfidf.addDocument(text);

    return tfidf
      .listTerms(0)
      .slice(0, topN)
      .map((item) => item.term)
      .filter((term): term is string => typeof term === "string");
  } catch {
    return fallbackKeywords(text, topN, locale);
  }
};

const resolveSources = (
  answer: string,
  footnotes: Map<string, string>
): string[] => {
  const seen = new Set<string>();
  const sources: string[] = [];

  for (const match of answer.matchAll(INLINE_FOOTNOTE_RE)) {
    const anchorId = match[2];
    if (!anchorId) {
      continue;
    }

    const source = footnotes.get(anchorId);
    if (!source || seen.has(source)) {
      continue;
    }

    seen.add(source);
    sources.push(source);
  }

  return sources;
};

const mergeOptions = (
  options?: Partial<Omit<ParserOptions, "nowIso">>
): ParserOptions => {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    nowIso: new Date().toISOString(),
  };
};

const createSection = (partMatch: RegExpMatchArray): MutableSection => {
  const sectionNumber = partMatch[1]?.trim() ?? "";
  const sectionTitle = (partMatch[2] ?? "").trim();

  return {
    questions: [],
    section_id: `section_${sectionNumber}`,
    section_number: sectionNumber,
    section_title: sectionTitle,
  };
};

interface QuestionHeading {
  explicitNumber: string | null;
  question: string;
}

const parseQuestionHeading = (rawHeading: string): QuestionHeading => {
  const heading = rawHeading.trim();
  const numberedMatch = heading.match(QUESTION_NUMBER_RE);

  if (numberedMatch) {
    return {
      explicitNumber: numberedMatch[1]?.trim() ?? null,
      question: numberedMatch[2]?.trim() ?? "",
    };
  }

  return {
    explicitNumber: null,
    question: heading,
  };
};

const finalizeQuestion = (
  state: ParserState,
  footnotes: Map<string, string>,
  options: ParserOptions
): void => {
  if (!(state.currentSection && state.currentQuestion)) {
    return;
  }

  const locale = toLocaleFromLang(options.lang);
  const answer = stripTrailingHeadingArtifacts(state.answerLines.join("\n"));
  state.answerLines = [];

  if (!answer) {
    state.currentQuestion = null;
    return;
  }

  const sources = resolveSources(answer, footnotes);
  const searchableText = `Question: ${state.currentQuestion.question}\n\nAnswer: ${answer}`;
  const keywords = extractKeywords(searchableText, options.keywordTopN, locale);
  const sectionNumber = state.currentSection.section_number;
  const sectionId = state.currentSection.section_id;
  const sectionTitle = state.currentSection.section_title;

  const metadata: QuestionMetadata = {
    answer_length: answer.length,
    category: options.category,
    created_at: options.nowIso,
    has_sources: sources.length > 0,
    keywords,
    lang: options.lang,
    question_number: state.currentQuestion.questionNumber,
    section_id: sectionId,
    section_number: sectionNumber,
    section_title: sectionTitle,
    updated_at: options.nowIso,
  };

  const searchFields: QuestionSearchFields = {
    category_searchable: toLowerCase(options.category, locale),
    keywords_searchable: keywords.join(" "),
    question_lower: toLowerCase(state.currentQuestion.question, locale),
  };

  const question: ParsedQuestion = {
    answer,
    id: state.currentQuestion.id,
    metadata,
    question: state.currentQuestion.question,
    searchable_text: searchableText,
    search_fields: searchFields,
    sources,
  };

  state.currentSection.questions.push(question);
  state.currentQuestion = null;
};

const finalizeSection = (state: ParserState): void => {
  if (!state.currentSection) {
    return;
  }

  state.sections.push({
    question_count: state.currentSection.questions.length,
    questions: state.currentSection.questions,
    section_id: state.currentSection.section_id,
    section_number: state.currentSection.section_number,
    section_title: state.currentSection.section_title,
  });

  state.currentSection = null;
};

const handlePartLine = (
  state: ParserState,
  partMatch: RegExpMatchArray,
  footnotes: Map<string, string>,
  options: ParserOptions
): void => {
  finalizeQuestion(state, footnotes, options);
  finalizeSection(state);
  state.currentSection = createSection(partMatch);
  state.questionIndex = 0;
};

const handleQuestionLine = (
  state: ParserState,
  questionText: string,
  explicitQuestionNumber: string | null,
  footnotes: Map<string, string>,
  options: ParserOptions
): void => {
  finalizeQuestion(state, footnotes, options);

  if (!state.currentSection) {
    return;
  }

  state.questionIndex += 1;
  const questionNumber = explicitQuestionNumber ?? `${state.questionIndex}`;
  state.currentQuestion = {
    id: `section_${state.currentSection.section_number}_q_${state.questionIndex}`,
    question: questionText.trim(),
    questionNumber,
  };
};

export const parseQaMarkdown = (
  markdown: string,
  options?: Partial<Omit<ParserOptions, "nowIso">>
): ParsedMarkdown => {
  const resolvedOptions = mergeOptions(options);
  const lines = normalizeEol(markdown).split("\n");
  const footnotes = extractFootnotes(lines);

  const state: ParserState = {
    answerLines: [],
    currentQuestion: null,
    currentSection: null,
    questionIndex: 0,
    sections: [],
    startedContent: false,
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!state.startedContent) {
      const firstPartMatch = line.match(PART_RE);
      if (!firstPartMatch) {
        continue;
      }

      state.startedContent = true;
      state.currentSection = createSection(firstPartMatch);
      state.questionIndex = 0;
      continue;
    }

    if (trimmed.match(FOOTNOTE_LINE_RE)) {
      break;
    }

    if (trimmed.match(APPENDIX_RE)) {
      break;
    }

    const partMatch = line.match(PART_RE);
    if (partMatch) {
      handlePartLine(state, partMatch, footnotes, resolvedOptions);
      continue;
    }

    const questionMatch = line.match(QUESTION_HEADING_RE);
    if (questionMatch) {
      handleQuestionLine(
        state,
        (questionMatch[2] ?? "").trim(),
        (questionMatch[1] ?? "").trim(),
        footnotes,
        resolvedOptions
      );
      continue;
    }

    if (isVietnameseLang(resolvedOptions.lang)) {
      const sectionQuestionMatch = line.match(SECTION_QUESTION_RE);
      if (sectionQuestionMatch) {
        const heading = parseQuestionHeading(sectionQuestionMatch[1] ?? "");
        handleQuestionLine(
          state,
          heading.question,
          heading.explicitNumber,
          footnotes,
          resolvedOptions
        );
        continue;
      }
    }

    if (state.currentQuestion) {
      state.answerLines.push(line);
    }
  }

  finalizeQuestion(state, footnotes, resolvedOptions);
  finalizeSection(state);

  const questionCount = state.sections.reduce(
    (total, section) => total + section.questions.length,
    0
  );

  return {
    sections: state.sections,
    stats: {
      footnotes: footnotes.size,
      questions: questionCount,
      sections: state.sections.length,
    },
  };
};

export const flattenSectionsToImportItems = (
  sections: ParsedSection[]
): QAImportItem[] => {
  const items: QAImportItem[] = [];

  for (const section of sections) {
    for (const question of section.questions) {
      items.push({
        answer: question.answer,
        category: question.metadata.category,
        id: question.id,
        keywords: question.metadata.keywords,
        lang: question.metadata.lang,
        metadata: question.metadata,
        question: question.question,
        question_number: question.metadata.question_number,
        searchable_text: question.searchable_text,
        search_fields: question.search_fields,
        section_id: section.section_id,
        section_number: section.section_number,
        section_title: section.section_title,
        sources: question.sources,
      });
    }
  }

  return items;
};
