import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

dotenv.config({ path: ".env.local" });

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const convexUrl = requireEnv("CONVEX_URL");
  const client = new ConvexHttpClient(convexUrl);

  const jsonPath = process.argv[2] || "data/qa_en.json";
  console.log(`Reading data from ${jsonPath}`);

  const data = await readFile(jsonPath, "utf-8");
  const parsed = JSON.parse(data);

  if (!parsed.sections || !Array.isArray(parsed.sections)) {
    throw new Error("Invalid JSON format: expected { sections: [...] }");
  }

  const items: any[] = [];

  for (const section of parsed.sections) {
    for (const question of section.questions) {
      items.push({
        question: question.question,
        answer: question.answer,
        searchable_text: question.searchable_text,
        category: question.metadata?.category || "Carbon Market",
        lang: question.metadata?.lang || "en",
        section_id: question.metadata?.section_id,
        section_number: question.metadata?.section_number,
        section_title: question.metadata?.section_title,
        question_number: question.id,
        keywords: question.metadata?.keywords || [],
        metadata: question.metadata,
        search_fields: question.search_fields,
        sources: question.sources || [],
      });
    }
  }

  console.log(`Importing ${items.length} questions...`);

  const result = await client.action(api.actions.importQASimple, {
    items,
    skipExisting: false,
  });

  console.log("Import result:", result);
}

main().catch(console.error);