import { readFile } from "node:fs/promises";
import path from "node:path";

import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";

import { api } from "../convex/_generated/api";
import {
  flattenSectionsToImportItems,
  parseQaMarkdown,
} from "./lib/qa-markdown-parser";

dotenv.config({ path: ".env.local" });

interface CliOptions {
  category: string;
  dryRun: boolean;
  input: string;
  keywordTopN: number;
  lang: string;
  skipExisting: boolean;
}

interface ImportResult {
  failures: Array<{ error: string; question: string }>;
  inserted: number;
  updated: number;
}

const DEFAULT_INPUT_PATH = "data/data-vi.md";

const parseArguments = (argv: string[]): Map<string, string | true> => {
  const parsed = new Map<string, string | true>();

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current?.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      parsed.set(key, true);
      continue;
    }

    parsed.set(key, next);
    index += 1;
  }

  return parsed;
};

const asString = (
  value: string | true | undefined,
  fallback: string
): string => {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
};

const asNumber = (
  value: string | true | undefined,
  fallback: number,
  label: string
): number => {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return parsed;
};

const asBoolean = (
  value: string | true | undefined,
  fallback: boolean
): boolean => {
  if (value === undefined) {
    return fallback;
  }

  if (value === true) {
    return true;
  }

  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n"].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
};

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const buildOptions = (): CliOptions => {
  const parsed = parseArguments(process.argv.slice(2));

  return {
    category: asString(
      parsed.get("category"),
      process.env.QA_CATEGORY ?? "Carbon Market"
    ),
    dryRun: asBoolean(parsed.get("dry-run"), false),
    input: asString(parsed.get("input"), DEFAULT_INPUT_PATH),
    keywordTopN: asNumber(parsed.get("keyword-top-n"), 10, "keyword-top-n"),
    lang: asString(parsed.get("lang"), "vi"),
    skipExisting: asBoolean(parsed.get("skip-existing"), false),
  };
};

const main = async () => {
  const options = buildOptions();
  const inputPath = path.resolve(options.input);

  const markdown = await readFile(inputPath, "utf8");
  const parsed = parseQaMarkdown(markdown, {
    category: options.category,
    keywordTopN: options.keywordTopN,
    lang: options.lang,
  });

  const items = flattenSectionsToImportItems(parsed.sections);

  console.log(`Input: ${inputPath}`);
  console.log(
    `Parsed ${parsed.stats.sections} sections and ${parsed.stats.questions} questions (${parsed.stats.footnotes} footnotes found).`
  );
  console.log(`Prepared ${items.length} import items.`);
  console.log(`skipExisting: ${options.skipExisting}`);

  if (items.length === 0) {
    throw new Error("No valid QA entries were parsed from markdown.");
  }

  if (options.dryRun) {
    console.log("Dry run complete. No data imported.");
    return;
  }

  const convexUrl = requireEnv("CONVEX_URL");
  requireEnv("GOOGLE_API_KEY");

  const client = new ConvexHttpClient(convexUrl);
  const result = (await client.action(api.ingest.importQAWithEmbeddings, {
    items,
    skipExisting: options.skipExisting,
  })) as ImportResult;

  console.log(
    `Import finished. Inserted: ${result.inserted}, Updated: ${result.updated}`
  );
  if (result.failures.length > 0) {
    console.log(`Failures: ${result.failures.length}`);
    for (const failure of result.failures.slice(0, 10)) {
      console.log(`- ${failure.question}: ${failure.error}`);
    }
  }
};

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
});
