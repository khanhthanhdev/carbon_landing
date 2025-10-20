# Follow-up Questions - Testing Guide

## Manual Testing Steps

### 1. Basic Follow-up Question Flow

**Test in AI Chat Interface (Full Page)**:
1. Navigate to the AI Chat page
2. Ask a question: "What is carbon trading?"
3. Verify that you receive an answer with citations
4. Verify that 2-3 follow-up question buttons appear below the answer
5. Click on one of the suggested follow-up questions
6. Verify that the question is automatically sent
7. Verify that the AI responds with context from the previous conversation

**Test in AI Chat Dialog (Popup)**:
1. Click the AI Assistant button (floating button or trigger)
2. Ask a question: "What is carbon trading?"
3. Verify that you receive an answer with citations
4. Verify that 2-3 follow-up question buttons appear below the answer
5. Click on one of the suggested follow-up questions
6. Verify that the question is automatically sent
7. Verify that the AI responds with context from the previous conversation

### 2. Multi-turn Conversation

**In both interfaces**:
1. Continue asking questions or clicking follow-up suggestions
2. Verify that each response is contextually aware of previous messages
3. Check that new follow-up questions appear after each assistant response
4. Verify follow-up questions are relevant to the conversation flow

### 2. Bilingual Testing

**English (test in both interfaces)**:
- Switch to English locale
- Ask: "What is carbon trading?"
- Verify follow-up questions are in English
- Verify conversation maintains context

**Vietnamese (test in both interfaces)**:
- Switch to Vietnamese locale
- Ask: "Giao dịch carbon là gì?"
- Verify follow-up questions are in Vietnamese
- Verify conversation maintains context

### 3. Edge Cases

**No follow-up questions generated**:
- If follow-up generation fails, verify that:
  - The conversation still works
  - No error is shown to the user
  - The chat interface remains functional

**Long conversation history**:
- Ask 15+ questions in a row
- Verify that only the last 10 messages are used for context
- Verify performance remains acceptable

**Empty conversation**:
- Start a fresh session
- Verify the welcome screen appears
- Verify suggested questions work correctly

### 4. UI/UX Verification

**Follow-up question appearance (test in both interfaces)**:
- Verify buttons have proper styling
- Verify hover effects work
- Verify buttons are disabled during loading (`isSending` state)
- Verify text wraps properly for long questions

**Follow-up question placement**:
- Verify follow-ups appear only below assistant messages
- Verify follow-ups don't appear below user messages
- Verify follow-ups don't duplicate
- In the dialog: verify follow-ups fit properly within the dialog width

**Loading states**:
- While AI is thinking, verify:
  - Follow-up buttons from previous message are still clickable
  - New follow-up questions don't appear until response is complete
  
**Dialog-specific checks**:
- Verify follow-up buttons work when dialog is scrolled
- Verify clicking follow-up doesn't close the dialog
- Verify follow-up questions remain visible when new messages are added

## Expected Behavior

### Successful Flow
```
User: "What is carbon trading?"
↓
AI: "Carbon trading is a market mechanism... [Source 1]"
Follow-ups:
  • How are carbon credits traded?
  • Who can participate in carbon markets?
  • What are the types of carbon credits?
↓
User clicks: "How are carbon credits traded?"
↓
AI: "As discussed, carbon trading involves... [Source 2]"
Follow-ups:
  • What is the carbon credit pricing mechanism?
  • How do companies buy carbon credits?
```

### Context Awareness Test
```
Conversation 1:
User: "What is carbon trading?"
AI: "Carbon trading is... [answer about carbon trading]"

Conversation 2 (should reference first):
User: "How does it work?"
AI: "Carbon trading (that we discussed) works by... [should understand 'it' refers to carbon trading]"
```

## Backend Verification

### Database Checks

1. **Check conversation storage**:
   - Query the `conversations` table
   - Verify `messages` array contains `followUpQuestions` field for assistant messages
   - Verify `followUpQuestions` is an array of strings

2. **Check conversation retrieval**:
   - Verify `getConversation` query returns full message history
   - Verify `followUpQuestions` are included in the response

### API Response Checks

1. **askAI action response**:
   ```json
   {
     "answer": "...",
     "sources": [...],
     "followUpQuestions": [
       "Question 1",
       "Question 2",
       "Question 3"
     ],
     "conversationId": "conv_...",
     "metadata": {...}
   }
   ```

2. **Verify follow-up questions**:
   - Should be 2-3 questions
   - Should be relevant to the conversation
   - Should be in the correct language
   - Should be concise (< 150 characters each)

## Performance Checks

1. **Response time**:
   - First message: ~2-4 seconds
   - Follow-up messages with history: ~2-5 seconds
   - Follow-up question generation: ~1-2 seconds

2. **Resource usage**:
   - Check Gemini API rate limits aren't exceeded
   - Verify conversation history doesn't cause excessive memory usage

## Known Limitations

1. Follow-up questions are generated after the main answer, so there's a slight delay
2. Follow-up generation can fail without affecting the main conversation
3. Only the last 10 messages are used for context (older messages are ignored)
4. Follow-up questions are suggestions - they may not always be perfectly relevant

## Troubleshooting

**No follow-up questions appear**:
- Check browser console for errors
- Verify `followUpQuestions` field in API response
- Check if follow-up generation failed (check server logs)

**Follow-up questions not in correct language**:
- Verify locale is passed correctly to `askAI` action
- Check `generateFollowUpQuestions` receives correct locale parameter

**Context not maintained across messages**:
- Verify conversation history is retrieved from database
- Check that `generateTextWithHistory` is called with correct history
- Verify session ID remains consistent across requests

**Follow-up buttons not clickable**:
- Check if `isSending` state is preventing clicks
- Verify `handleFollowUpQuestion` function is working
- Check for any JavaScript errors in console
