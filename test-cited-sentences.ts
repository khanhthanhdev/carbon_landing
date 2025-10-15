/**
 * Test script for extractCitedSentences function
 * This is a temporary test file to verify the implementation
 */

import { extractCitations, extractCitedSentences, type Citation } from './lib/ai/citations';

// Test data
const testAnswer = `Carbon credits are tradable certificates that represent one ton of CO2 equivalent emissions reduced or removed [Source 1]. They can be traded on voluntary or compliance markets [Source 2]. According to international standards, "countries must establish transparent systems for tracking carbon credits" [Source 3].`;

const testSources = [
    {
        id: "1",
        answer: "A carbon credit is a tradable certificate or permit representing the right to emit one ton of carbon dioxide equivalent. Carbon credits are created when activities reduce, avoid, or remove greenhouse gas emissions. These certificates can be bought and sold in carbon markets."
    },
    {
        id: "2",
        answer: "Carbon markets can be divided into two main categories: compliance markets and voluntary markets. Compliance markets are created by mandatory cap-and-trade systems. Voluntary markets allow companies to purchase carbon credits voluntarily."
    },
    {
        id: "3",
        answer: "International carbon credit standards require transparent tracking systems. Countries must establish robust monitoring, reporting, and verification systems. These systems ensure the integrity of carbon credit transactions and prevent double counting."
    }
];

// Test the implementation
function testExtractCitedSentences() {
    console.log('Testing extractCitedSentences function...\n');

    // Extract citations from the test answer
    const citations = extractCitations(testAnswer);
    console.log('Extracted citations:', citations);

    // Test each citation
    citations.forEach((citation, index) => {
        console.log(`\n--- Testing Citation ${index + 1}: ${citation.marker} ---`);

        // Get the corresponding source (assuming Source N maps to index N-1)
        const sourceIndex = citation.sourceIndex;
        if (sourceIndex !== undefined && sourceIndex < testSources.length) {
            const source = testSources[sourceIndex];

            // Extract cited sentences
            const citedSentences = extractCitedSentences(testAnswer, citation, source.answer);

            console.log(`Source answer: "${source.answer}"`);
            console.log(`Cited sentences found: ${citedSentences.length}`);

            citedSentences.forEach((citedSentence, sentenceIndex) => {
                console.log(`  ${sentenceIndex + 1}. "${citedSentence.sentence}" (similarity: ${citedSentence.similarity.toFixed(3)})`);
            });
        } else {
            console.log('No matching source found for this citation');
        }
    });
}

// Run the test
testExtractCitedSentences();