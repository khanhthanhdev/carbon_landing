# Follow-up Questions Implementation

## Overview

This implementation adds context-aware follow-up question functionality to the AI chat interface. The system now:

1. **Maintains conversation history** - Retrieves previous messages from the conversation
2. **Provides context-aware responses** - Passes conversation history to Gemini LLM
3. **Generates follow-up questions** - Suggests 2-3 relevant questions based on the conversation
4. **Displays follow-up questions in UI** - Shows clickable follow-up question buttons

## Key Changes

### 1. Backend Changes

#### `/lib/ai/gemini.ts`
- **Added `generateTextWithHistory()` method**: New method that accepts conversation history and passes it to Gemini API for multi-turn conversations
  - Builds proper conversation structure with system prompts
  - Limits history to last 10 messages to avoid context overflow
  - Supports both English and Vietnamese

#### `/convex/actions.ts`
- **Modified `askAI` action**:
  - Retrieves conversation history from database before generating answer
  - Uses `generateTextWithHistory()` when history exists, otherwise falls back to `generateText()`
  - Added `generateFollowUpQuestions()` helper function to create 2-3 relevant follow-up questions
  - Saves follow-up questions with the assistant's message
  - Returns follow-up questions in the response

- **Added `generateFollowUpQuestions()` function**:
  - Generates 2-3 contextually relevant follow-up questions
  - Supports both English and Vietnamese
  - Parses LLM response into an array of questions
  - Gracefully handles errors by returning empty array

#### `/convex/schema.ts`
- **Updated conversation schema**: Added optional `followUpQuestions` field to message objects

#### `/convex/mutations/conversations.ts`
- **Updated `saveConversationMessage` mutation**: Added `followUpQuestions` parameter to save follow-up questions with messages

### 2. Frontend Changes

#### `/hooks/use-ai-chat.ts`
- Already had `followUpQuestions` support in the `ChatMessage` interface
- No changes needed - the hook already handles follow-up questions

#### `/components/ai-chat-interface.tsx`
- Already implemented follow-up question display and click handling
- The `handleFollowUpQuestion()` function was already present
- Follow-up questions display below assistant messages
- No changes needed - the UI was already prepared for follow-up questions

#### `/components/ai-chat-dialog.tsx` ✨ NEW
- **Added `handleFollowUpQuestion()` function**: Handles clicking follow-up question buttons
  - Sets the input value to the clicked question
  - Automatically sends the question
  - Focuses the input for visual feedback
- **Updated message rendering**: Wrapped messages in a container div to include follow-up questions
- **Follow-up question display**: Shows clickable buttons below assistant messages
  - Buttons are disabled when `isSending` is true
  - Uses translation keys for labels
  - Matches the styling from `ai-chat-interface.tsx`

### 3. Translation Files

#### `/messages/en.json` and `/messages/vi.json`
- **Added translation keys for interface**:
  - `followUpTitle`: "Follow-up questions:" / "Câu hỏi tiếp theo:"
  - `followUpQuestions`: "You might also want to ask:" / "Bạn cũng có thể muốn hỏi:"
- **Added translation keys for dialog**:
  - `followUpTitle`: "Follow-up questions:" / "Câu hỏi tiếp theo:"

## How It Works

### User Flow

1. **User asks a question** → System generates an answer with citations
2. **System generates follow-up questions** based on:
   - The user's original question
   - The generated answer
   - Previous conversation context (if any)
3. **User sees 2-3 follow-up question buttons** below the assistant's response
4. **User clicks a follow-up question** → Question is automatically sent
5. **System uses full conversation history** to provide context-aware responses

### Technical Flow

```
User Question
    ↓
Retrieve Conversation History (from Convex DB)
    ↓
Generate Query Embedding
    ↓
Vector Search for Relevant Q&As
    ↓
Build Context String with Sources
    ↓
Generate Answer (with conversation history if available)
    ↓
Extract Citations
    ↓
Generate Follow-up Questions
    ↓
Save to Database (user message + assistant message with follow-ups)
    ↓
Return Response (answer + sources + follow-up questions)
    ↓
Display in UI (with clickable follow-up buttons)
```

## Benefits

1. **Better User Experience**: Users can naturally continue the conversation by clicking suggested questions in both the full-page interface and the dialog
2. **Context-Aware Responses**: The LLM understands previous conversation context
3. **Guided Exploration**: Follow-up questions help users discover related topics
4. **Bilingual Support**: Works seamlessly in both English and Vietnamese
5. **Consistent UI**: Follow-up questions work identically in both `ai-chat-interface` (full-page) and `ai-chat-dialog` (popup)

## Example Conversation

**User**: "What is carbon trading?"

**Assistant**: "Carbon trading is a market-based approach... [Source 1]"

**Follow-up Questions**:
- How are carbon credits traded?
- Who can participate in carbon markets?
- What are the types of carbon credits?

**User clicks**: "How are carbon credits traded?"

**Assistant** (with context): "Building on the carbon trading concept we discussed, carbon credits are traded through..."

## Configuration

- **Max conversation history**: 10 messages (configurable in `generateTextWithHistory`)
- **Follow-up questions count**: 2-3 questions (configurable in `generateFollowUpQuestions`)
- **Max question length**: 150 characters
- **Token limit for follow-ups**: 200 tokens

## Error Handling

- If conversation history retrieval fails, the system logs a warning and continues without history
- If follow-up question generation fails, the system returns an empty array
- All failures are non-blocking - the chat continues to work normally

## Future Enhancements

1. **User feedback on follow-up questions**: Track which questions users click
2. **Personalized follow-ups**: Generate questions based on user's interests
3. **Follow-up chains**: Generate multi-level follow-up questions
4. **Smart question ranking**: Prioritize more relevant follow-up questions
