import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";
import pLimit from "p-limit";
import { api } from "../convex/_generated/api";

const CONCURRENCY = Number(process.env.EMBED_CONCURRENCY || "3");

interface CliArgs {
  categories?: string[];
  lang?: string;
  limit?: number;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {};

  for (const raw of args) {
    const [keyPart, valuePart] = raw.split("=");
    const key = keyPart.replace(/^--/, "");
    const value = valuePart?.trim();

    if (!value) {
      continue;
    }

    if (key === "category" || key === "categories") {
      result.categories = value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    } else if (key === "lang" || key === "language") {
      result.lang = value;
    } else if (key === "limit") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed) && parsed > 0) {
        result.limit = parsed;
      }
    }
  }

  return result;
}

async function main() {
  const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL");
  requireEnv("GOOGLE_API_KEY");

  const { categories, lang, limit } = parseArgs();
  const client = new ConvexHttpClient(convexUrl);
  const convexApi = api as any;

  const all = await client.query(convexApi.queries.qa.listAll, {});

  const filtered = all.filter((doc: any) => {
    if (
      categories &&
      categories.length > 0 &&
      !categories.includes(doc.category)
    ) {
      return false;
    }
    if (lang && doc.lang && doc.lang !== lang) {
      return false;
    }
    return true;
  });

  const items = typeof limit === "number" ? filtered.slice(0, limit) : filtered;

  if (items.length === 0) {
    console.log("No QA records matched the provided filters.");
    return;
  }

  console.log(
    `Re-embedding ${items.length} QA records (concurrency=${CONCURRENCY}${
      categories && categories.length > 0
        ? `, categories=${categories.join(",")}`
        : ""
    }${lang ? `, lang=${lang}` : ""})`
  );

  const limitConcurrency = pLimit(CONCURRENCY);
  let updated = 0;
  const failures: Array<{ id: string; error: unknown }> = [];

  await Promise.all(
    items.map((doc: any) =>
      limitConcurrency(async () => {
        try {
          const embedded = await client.action(
            convexApi.embeddings.embedQADocumentAll,
            {
              question: doc.question,
              answer: doc.answer,
            }
          );

          const composedContent = `${doc.question}\n\n${doc.answer}`.trim();

          const payload = {
            id: doc._id,
            question: doc.question,
            answer: doc.answer,
            sources: doc.sources ?? [],
            category: doc.category,
            lang: doc.lang ?? undefined,
            content: composedContent,
            searchable_text: composedContent,
            section_id: doc.section_id,
            section_number: doc.section_number,
            section_title: doc.section_title,
            question_number: doc.question_number,
            source_id: doc.source_id,
            keywords: doc.keywords,
            question_lower: doc.question_lower,
            keywords_searchable: doc.keywords_searchable,
            category_searchable: doc.category_searchable,
            has_sources: doc.has_sources,
            answer_length: doc.answer_length,
            metadata_created_at: doc.metadata_created_at,
            metadata_updated_at: doc.metadata_updated_at,
            embedding_doc: embedded.embedding_doc,
            embedding_qa: embedded.embedding_qa,
            embedding_fact: embedded.embedding_fact,
          };

          await client.mutation(convexApi.mutations.qa.upsertQA, payload);

          updated += 1;
          if (updated % 25 === 0 || updated === items.length) {
            console.log(`Re-embedded ${updated}/${items.length}`);
          }
        } catch (error) {
          failures.push({ id: String(doc._id || doc.question), error });
          console.error(`Failed to re-embed ${doc.question}:`, error);
        }
      })
    )
  );

  if (failures.length > 0) {
    console.warn(`Re-embedding finished with ${failures.length} failures.`);
  }

  console.log(`Re-embedding complete. Updated ${updated} records.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
