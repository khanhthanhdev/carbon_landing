# AI Chat Implementation with RAG

## Overview
Successfully integrated the real AI chatbot with RAG (Retrieval-Augmented Generation) from Convex into the `/ask-ai` page.

## Changes Made

### 1. Updated `/app/[locale]/ask-ai/page.tsx`
- Removed mock conversation state management
- Integrated `useAIChat` hook for real conversation data
- Added `useGenerateSessionId` hook for unique session management
- Connected to Convex backend via the custom hook
- Simplified to single-session conversation model

### 2. Updated `/components/ai-chat-interface.tsx`
- Modified to accept `messages` array directly instead of `Conversation` object
- Added loading states (`isLoading`, `isSending`)
- Added error handling with Alert component
- Integrated with real `ChatMessage` type from `use-ai-chat` hook
- Added loading spinner during message sending
- Improved UX with disabled states during sending
- Maps Convex message sources to citation format for display

### 3. Updated `/components/ai-chat-sidebar.tsx`
- Simplified from multi-conversation to single-session sidebar
- Removed conversation history management
- Added informational content about RAG features
- Displays session ID for debugging
- Cleaner, more focused UI

### 4. API Route `/app/api/ask-ai/route.ts`
- **Note**: Not currently used - calls go directly to Convex from client
- Kept for potential future server-side use cases
- Can be used for server-side rendering or API integrations

### 5. Hook `/hooks/use-ai-chat.ts`
- Properly implemented with:
  - Conversation fetching via `getConversation` query
  - Message sending directly to Convex via `useConvex()` hook
  - Loading and error state management
  - Automatic conversation refresh after sending
  - Session ID generation utility
  - Direct Convex action calls (no API route needed)

## How It Works

### Flow:
1. **User opens `/ask-ai` page**
   - Unique session ID is generated
   - Hook fetches existing conversation (if any)
   - Empty state shown if no messages

2. **User sends a message**
   - Message sent directly to Convex `askAI` action via React client
   - Action performs:
     - Query embedding generation
     - Vector search for relevant Q&As
     - Context building with sources
     - Answer generation with Gemini
     - Citation extraction
     - Conversation saving

3. **Response displayed**
   - Answer shown with inline citations `[Source N]`
   - Sources panel shows referenced Q&As
   - Citations linked to specific sentences
   - Metadata includes relevance scores

### Key Features:
- **RAG-powered answers**: Uses vector search to find relevant Q&As
- **Source citations**: Every answer includes numbered citations
- **Multilingual**: Supports English and Vietnamese
- **Conversation persistence**: Messages saved to Convex database
- **Real-time updates**: Automatic refresh after sending
- **Error handling**: Graceful error display and recovery
- **Loading states**: Clear feedback during operations

## Convex Integration

### Actions Used:
- `api.actions.askAI` - Main RAG query handler
- `api.actions.vectorSearch` - Semantic search for relevant Q&As

### Queries Used:
- `api.queries.conversations.getConversation` - Fetch conversation history

### Mutations Used:
- `api.mutations.conversations.saveConversationMessage` - Save messages

## Data Flow

```
User Input
    ↓
useAIChat Hook
    ↓
Convex React Client (useConvex)
    ↓
Convex askAI Action
    ↓
├─ Generate Embedding
├─ Vector Search
├─ Build Context
├─ Generate Answer (Gemini)
├─ Extract Citations
└─ Save Conversation
    ↓
Response with Sources
    ↓
UI Update with Citations
```

## Message Structure

### ChatMessage (from Convex):
```typescript
{
  role: "user" | "assistant",
  content: string,
  timestamp: number,
  sources?: Array<{
    questionId: Id<"qa">,
    questionNumber: string,
    question: string,
    relevanceScore: number,
    citedSentences?: string[],
    citationMarkers?: string[]
  }>,
  metadata?: {
    sourcesUsed: number,
    generationTimeMs: number,
    tokensUsed?: number
  }
}
```

### Display Message (for UI):
```typescript
{
  id: string,
  role: "user" | "assistant",
  content: string,
  timestamp: Date,
  citations?: Array<{
    id: number,
    text: string,
    source: string,
    page?: string
  }>
}
```

## Testing

To test the implementation:

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Navigate to `/ask-ai` page

3. Ask a question about carbon markets, e.g.:
   - "What is a carbon market?"
   - "How do carbon credits work?"
   - "What is the difference between compliance and voluntary markets?"

4. Verify:
   - Answer appears with citations
   - Sources panel shows referenced Q&As
   - Citations are clickable and highlighted
   - Conversation persists on page refresh
   - Loading states work correctly
   - Errors are handled gracefully

## Future Enhancements

Potential improvements:
- [ ] Add conversation history sidebar (multiple sessions)
- [ ] Implement feedback mutation for rating answers
- [ ] Add conversation export/sharing
- [ ] Support for follow-up questions with context
- [ ] Add typing indicators
- [ ] Implement message editing
- [ ] Add conversation search
- [ ] Support for file attachments
- [ ] Add conversation analytics

## Notes

- Session IDs are generated client-side and persist for the page session
- Conversations are stored in Convex `conversations` table
- Each message includes full source metadata for transparency
- Citations are extracted using regex patterns from generated answers
- The system uses Gemini for both embeddings and answer generation
- Vector search uses 768-dimensional embeddings
- Maximum 5 sources used per answer (configurable)
