import { readFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import pLimit from "p-limit";
import { api } from "../convex/_generated/api";

dotenv.config({ path: ".env.local" });

const CONCURRENCY = Number(process.env.EMBED_CONCURRENCY || "3");
const DEFAULT_LANG = process.env.DEFAULT_LANG || "en";
const QA_SOURCE_PATH = process.env.QA_IMPORT_PATH || "data/qa_en.json";
const RETRIES = Number(process.env.EMBED_RETRIES || "4");
const RETRY_DELAY_MS = Number(process.env.EMBED_RETRY_DELAY_MS || "1500");
const RETRY_BACKOFF_MULTIPLIER = Number(process.env.EMBED_RETRY_BACKOFF || "2");

type QASource = {
  type?: string;
  title?: string;
  url?: string;
  location?: string;
  note?: string;
};

type NormalizedQAItem = {
  question: string;
  answer: string;
  category: string;
  lang?: string;
  sources?: QASource[];
  content: string;
  searchable_text?: string;
  section_id?: string;
  section_number?: string;
  section_title?: string;
  question_number?: string;
  source_id?: string;
  keywords?: string[];
  question_lower?: string;
  keywords_searchable?: string;
  category_searchable?: string;
  has_sources?: boolean;
  answer_length?: number;
  metadata_created_at?: string;
  metadata_updated_at?: string;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function sanitizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const result = value
    .map((entry) => sanitizeString(entry))
    .filter((entry): entry is string => Boolean(entry));
  return result.length > 0 ? result : undefined;
}

function parseSources(value: unknown): QASource[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const sources = value
    .map((entry) => {
      if (typeof entry === "string") {
        const note = sanitizeString(entry);
        return note ? { note } : undefined;
      }

      if (!entry || typeof entry !== "object") {
        return undefined;
      }

      const source: QASource = {};
      const raw = entry as Record<string, unknown>;
      const type = sanitizeString(raw.type);
      const title = sanitizeString(raw.title);
      const url = sanitizeString(raw.url);
      const location = sanitizeString(raw.location);
      const note = sanitizeString(raw.note);
      if (type) {
        source.type = type;
      }
      if (title) {
        source.title = title;
      }
      if (url) {
        source.url = url;
      }
      if (location) {
        source.location = location;
      }
      if (note) {
        source.note = note;
      }
      return Object.keys(source).length > 0 ? source : undefined;
    })
    .filter((source): source is QASource => source !== undefined);

  return sources.length > 0 ? sources : undefined;
}

function ensureArray<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
}

function normalizeQAData(
  data: unknown,
  defaultLang: string
): NormalizedQAItem[] {
  const sections = extractSections(data);
  const items: NormalizedQAItem[] = [];

  for (const section of sections) {
    const sectionInfo = section ?? {};
    const sectionId = sanitizeString(sectionInfo.section_id);
    const sectionNumber = sanitizeString(sectionInfo.section_number);
    const sectionTitle = sanitizeString(sectionInfo.section_title);
    const questions = ensureArray<any>(sectionInfo.questions) ?? [];

    for (const question of questions) {
      const questionText = sanitizeString(question?.question);
      const answerText = sanitizeString(question?.answer);

      if (!(questionText && answerText)) {
        continue;
      }

      const metadata =
        question && typeof question.metadata === "object" && question.metadata
          ? (question.metadata as Record<string, unknown>)
          : {};

      const searchFields =
        question &&
        typeof question.search_fields === "object" &&
        question.search_fields
          ? (question.search_fields as Record<string, unknown>)
          : {};

      const keywords =
        sanitizeStringArray(metadata.keywords) ??
        sanitizeStringArray(question?.keywords);

      const searchableText = sanitizeString(question?.searchable_text);

      const category =
        sanitizeString(metadata.category) ??
        sanitizeString(sectionInfo?.category) ??
        sectionTitle ??
        "general";

      const lang =
        sanitizeString(metadata.lang) ??
        sanitizeString(question?.lang) ??
        defaultLang;

      const questionNumber =
        sanitizeString(metadata.question_number) ??
        sanitizeString(question?.question_number);

      const resolvedSectionId =
        sanitizeString(metadata.section_id) ?? sectionId;

      const resolvedSectionNumber =
        sanitizeString(metadata.section_number) ?? sectionNumber;

      const resolvedSectionTitle =
        sanitizeString(metadata.section_title) ?? sectionTitle;

      const categorySearchable =
        sanitizeString(searchFields.category_searchable) ??
        (category ? category.toLowerCase() : undefined);

      const questionLower =
        sanitizeString(searchFields.question_lower) ??
        questionText.toLowerCase();

      const keywordsSearchable =
        sanitizeString(searchFields.keywords_searchable) ??
        (keywords ? keywords.join(" ").toLowerCase() : undefined);

      const sources = parseSources(question?.sources);
      const hasSources =
        typeof metadata.has_sources === "boolean"
          ? metadata.has_sources
          : (sources?.length ?? 0) > 0;

      const answerLength =
        typeof metadata.answer_length === "number"
          ? metadata.answer_length
          : answerText.length;

      const metadataCreatedAt = sanitizeString(metadata.created_at);
      const metadataUpdatedAt = sanitizeString(metadata.updated_at);

      items.push({
        question: questionText,
        answer: answerText,
        category,
        lang,
        sources,
        content: searchableText ?? `${questionText}\n\n${answerText}`,
        searchable_text: searchableText,
        section_id: resolvedSectionId,
        section_number: resolvedSectionNumber,
        section_title: resolvedSectionTitle,
        question_number: questionNumber,
        source_id: sanitizeString(question?.id),
        keywords,
        question_lower: questionLower,
        keywords_searchable: keywordsSearchable,
        category_searchable: categorySearchable,
        has_sources: hasSources,
        answer_length: answerLength,
        metadata_created_at: metadataCreatedAt,
        metadata_updated_at: metadataUpdatedAt,
      });
    }
  }

  return items;
}

function extractSections(data: unknown): Array<Record<string, unknown>> {
  if (!data || typeof data !== "object") {
    return [];
  }

  if (Array.isArray(data)) {
    return data as Array<Record<string, unknown>>;
  }

  const record = data as Record<string, unknown>;
  if (Array.isArray(record.sections)) {
    return record.sections as Array<Record<string, unknown>>;
  }

  if (Array.isArray(record.questions)) {
    return [record];
  }

  return [];
}

async function loadQAData(filePath: string, defaultLang: string) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  const normalized = normalizeQAData(parsed, defaultLang);
  if (normalized.length === 0) {
    throw new Error(`No valid QA entries found in ${filePath}.`);
  }
  return normalized;
}

async function runWithRetry<T>(operation: () => Promise<T>, context: string) {
  let attempt = 0;
  let delayMs = RETRY_DELAY_MS;

  while (attempt <= RETRIES) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      const message =
        error instanceof Error
          ? `${error.message}${error.cause ? ` (cause: ${String(error.cause)})` : ""}`
          : String(error);

      if (attempt > RETRIES) {
        throw new Error(
          `${context} failed after ${attempt} attempt(s): ${message}. ` +
            `Check CONVEX_URL (${process.env.CONVEX_URL}) reachability and network connectivity.`,
          { cause: error as Error }
        );
      }

      console.warn(
        `${context} failed on attempt ${attempt}/${RETRIES} with "${message}". Retrying in ${delayMs}ms...`
      );
      await delay(delayMs);
      delayMs *= RETRY_BACKOFF_MULTIPLIER;
    }
  }

  throw new Error(`Unexpected retry loop exit for ${context}`);
}

async function main() {
  const convexUrl = requireEnv("CONVEX_URL");
  const apiKey = requireEnv("GOOGLE_API_KEY");
  const convexApi = api as any;

  const qaPath = path.resolve(QA_SOURCE_PATH);
  console.log(`Loading QA data from ${qaPath}`);
  const items = await loadQAData(qaPath, DEFAULT_LANG);

  const client = new ConvexHttpClient(convexUrl);
  console.log(
    `Starting import of ${items.length} QA items with concurrency ${CONCURRENCY} (model: ${
      process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001"
    }, dim: ${process.env.EMBEDDING_DIM || "768"})`
  );

  const limit = pLimit(CONCURRENCY);
  let processed = 0;
  const failures: Array<{ index: number; question: string; error: unknown }> =
    [];

  await Promise.all(
    items.map((item, index) =>
      limit(async () => {
        try {
          const embedded = await runWithRetry(
            () =>
              client.action(convexApi.embeddings.embedQADocumentAll, {
                question: item.question,
                answer: item.answer,
              }),
            `Embedding generation for "${item.question}"`
          );

          const payload = {
            question: item.question,
            answer: item.answer,
            category: item.category,
            lang: item.lang ?? DEFAULT_LANG,
            sources: item.sources ?? [],
            content: item.content ?? embedded.composed,
            searchable_text: item.searchable_text,
            section_id: item.section_id,
            section_number: item.section_number,
            section_title: item.section_title,
            question_number: item.question_number,
            source_id: item.source_id,
            keywords: item.keywords,
            question_lower: item.question_lower,
            keywords_searchable: item.keywords_searchable,
            category_searchable: item.category_searchable,
            has_sources: item.has_sources,
            answer_length: item.answer_length,
            metadata_created_at: item.metadata_created_at,
            metadata_updated_at: item.metadata_updated_at,
            embedding_doc: embedded.embedding_doc,
            embedding_qa: embedded.embedding_qa,
            embedding_fact: embedded.embedding_fact,
          };

          await runWithRetry(
            () => client.mutation(convexApi.mutations.qa.upsertQA, payload),
            `Upsert mutation for "${item.question}"`
          );

          processed += 1;
          if (processed % 25 === 0 || processed === items.length) {
            console.log(`Imported ${processed}/${items.length}`);
          }
        } catch (error) {
          failures.push({ index, question: item.question, error });
          console.error(
            `Failed to import item ${index + 1} (${item.question}):`,
            error
          );

          if (
            error instanceof Error &&
            /fetch failed/i.test(error.message || "") &&
            !process.env.CONVEX_URL?.includes("localhost")
          ) {
            console.error(
              "Hint: verify internet access to Convex Cloud or run `npx convex dev` locally and set CONVEX_URL=http://localhost:4334."
            );
          }
        }
      })
    )
  );

  if (failures.length > 0) {
    console.warn(`Import completed with ${failures.length} failures.`);
  }

  console.log(
    `Done. Successfully imported ${processed} of ${items.length} items using CONVEX_URL=${convexUrl}`
  );
  console.log(
    `Ensure GOOGLE_API_KEY (${apiKey.slice(0, 6)}***) remains valid for follow-up runs.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
