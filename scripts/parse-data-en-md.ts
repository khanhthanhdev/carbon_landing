import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  flattenSectionsToImportItems,
  parseQaMarkdown,
} from "./lib/qa-markdown-parser";

interface CliOptions {
  category: string;
  dryRun: boolean;
  input: string;
  keywordTopN: number;
  lang: string;
  output: string;
}

const DEFAULT_INPUT_PATH = "data/data-en.md";
const DEFAULT_OUTPUT_PATH = "data/qa_en_from_data_en.json";

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
    lang: asString(parsed.get("lang"), process.env.DEFAULT_LANG ?? "en"),
    output: asString(parsed.get("output"), DEFAULT_OUTPUT_PATH),
  };
};

const main = async () => {
  const options = buildOptions();
  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);

  const content = await readFile(inputPath, "utf8");
  const parsed = parseQaMarkdown(content, {
    category: options.category,
    keywordTopN: options.keywordTopN,
    lang: options.lang,
  });

  const flattened = flattenSectionsToImportItems(parsed.sections);

  console.log(`Input: ${inputPath}`);
  console.log(
    `Parsed ${parsed.stats.sections} sections and ${parsed.stats.questions} questions (${parsed.stats.footnotes} footnotes found).`
  );
  console.log(`Prepared ${flattened.length} import items.`);

  if (options.dryRun) {
    const sample = flattened[0];
    if (sample) {
      console.log(`Sample question: ${sample.question}`);
    }
    console.log("Dry run complete. No file written.");
    return;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(parsed, null, 2), "utf8");

  console.log(`Output written to: ${outputPath}`);
};

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
});
