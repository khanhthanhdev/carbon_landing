import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the qa_en.json file
const inputPath = path.join(__dirname, '../data/qa_en.json');
const outputPath = path.join(__dirname, '../data/qa_en_convex.json');

const rawData = fs.readFileSync(inputPath, 'utf-8');
const data = JSON.parse(rawData);

// Transform to match qa table schema
const transformedQuestions = [];
const now = Date.now(); // Current timestamp in milliseconds

data.sections.forEach(section => {
  section.questions.forEach(q => {
    // Match the exact schema structure
    const transformed = {
      question: q.question,
      answer: q.answer,
      content: q.searchable_text, // Use searchable_text as content
      searchable_text: q.searchable_text,
      section_id: q.metadata.section_id,
      section_number: q.metadata.section_number,
      section_title: q.metadata.section_title,
      question_number: String(q.metadata.question_number),
      category: q.metadata.category,
      keywords: q.metadata.keywords || [],
      question_lower: q.search_fields.question_lower,
      keywords_searchable: q.search_fields.keywords_searchable,
      category_searchable: q.search_fields.category_searchable,
      lang: q.metadata.lang,
      has_sources: q.metadata.has_sources,
      answer_length: q.metadata.answer_length,
      metadata_created_at: q.metadata.created_at,
      metadata_updated_at: q.metadata.updated_at,
      sources: q.sources.map(sourceText => ({
        type: "reference",
        title: sourceText.substring(0, 100), // First 100 chars as title
        url: sourceText.match(/https?:\/\/[^\s)]+/)?.[0] || "", // Extract URL if present
        note: sourceText
      })),
      embedding_doc: [], // Empty array as required by schema
      createdAt: now,
      updatedAt: now,
    };

    transformedQuestions.push(transformed);
  });
});

// Write the transformed data
fs.writeFileSync(outputPath, JSON.stringify(transformedQuestions, null, 2));

console.log(`✅ Transformed ${transformedQuestions.length} questions`);
console.log(`📄 Output saved to: ${outputPath}`);
console.log(`\nSample transformed question:`);
console.log(JSON.stringify(transformedQuestions[0], null, 2));
