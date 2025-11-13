import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mdFilePath = path.join(__dirname, '..', 'data', 'co2_en.md');
const outputFilePath = path.join(__dirname, '..', 'data', 'qa_en.json');

function parseMarkdownToJSON(mdContent) {
  const lines = mdContent.split('\n');
  const sections = [];
  let currentSection = null;
  let currentQuestion = null;
  let questionIndex = 0;

  // First, parse footnotes
  const footnotes = {};
  let inFootnotes = false;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.match(/^\d+\.\s/)) {
      inFootnotes = true;
      const match = line.match(/^(\d+)\.\s(.+)\s\[↑\]\(#footnote-ref-(\d+)\)$/);
      if (match) {
        const num = match[3];
        const text = match[2];
        footnotes[num] = text;
      }
    } else if (inFootnotes && line === '') {
      continue;
    } else if (inFootnotes) {
      break;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for PART
    const partMatch = line.match(/^PART (\d+): (.+)$/);
    if (partMatch) {
      if (currentSection) {
        currentSection.question_count = currentSection.questions.length;
        sections.push(currentSection);
      }
      currentSection = {
        section_id: `section_${partMatch[1]}`,
        section_number: partMatch[1],
        section_title: partMatch[2],
        question_count: 0,
        questions: []
      };
      questionIndex = 0;
      continue;
    }

    // Check for question
    const questionMatch = line.match(/^# (\d+)\. (.+)$/);
    if (questionMatch && currentSection) {
      if (currentQuestion) {
        currentSection.questions.push(currentQuestion);
      }
      questionIndex++;
      currentQuestion = {
        id: `section_${currentSection.section_number}_q_${questionIndex}`,
        question: questionMatch[2],
        answer: '',
        searchable_text: '',
        metadata: {
          section: currentSection.section_number,
          question_number: questionIndex,
          created_at: new Date().toISOString()
        },
        sources: [],
        embedding: null,
        search_fields: {
          question: questionMatch[2],
          answer_preview: ''
        }
      };
      continue;
    }

    // Accumulate answer
    if (currentQuestion && line.trim() !== '') {
      currentQuestion.answer += line + '\n';
    }
  }

  // Push last section and question
  if (currentSection) {
    if (currentQuestion) {
      currentSection.questions.push(currentQuestion);
    }
    currentSection.question_count = currentSection.questions.length;
    sections.push(currentSection);
  }

  // Process each question to clean answer, set searchable_text, and extract sources
  sections.forEach(section => {
    section.questions.forEach(q => {
      q.answer = q.answer.trim();
      q.searchable_text = `Question: ${q.question}\n\nAnswer: ${q.answer}`;
      q.search_fields.answer_preview = q.answer.substring(0, 200) + (q.answer.length > 200 ? '...' : '');

      // Extract sources
      const footnoteMatches = q.answer.match(/\[\[\d+\]\]\(#footnote-(\d+)\)/g);
      if (footnoteMatches) {
        const uniqueFootnotes = [...new Set(footnoteMatches.map(m => m.match(/#footnote-(\d+)/)[1]))];
        q.sources = uniqueFootnotes.map(num => footnotes[num]).filter(Boolean);
      }
    });
  });

  return { sections };
}

fs.readFile(mdFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  const jsonData = parseMarkdownToJSON(data);

  fs.writeFile(outputFilePath, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('JSON file created successfully at', outputFilePath);
  });
});