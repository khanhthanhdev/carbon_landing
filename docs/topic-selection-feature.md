# Topic Selection Feature Implementation

## Overview
Added a topic selection feature to the AI chat sidebar that allows users to focus the AI assistant's responses on specific carbon market topics.

## Changes Made

### 1. Translation Files (`messages/en.json` & `messages/vi.json`)
- Added new translation keys under `aiChat.sidebar`:
  - `topicsTitle`: "Focus Topics" / "Chủ Đề Tập Trung"
  - `topicsDescription`: Description for topic selection
  - `topics`: Object containing 8 topic options:
    - `general`: General Carbon Markets
    - `trading`: Carbon Trading & Credits
    - `policy`: Climate Policy & Regulation
    - `projects`: Carbon Offset Projects
    - `accounting`: Carbon Accounting & Reporting
    - `compliance`: Compliance Markets
    - `voluntary`: Voluntary Carbon Markets
    - `technology`: Carbon Capture & Technology
- Added `topicFocus` translation under `aiChat.interface`

### 2. AI Chat Sidebar Component (`components/ai-chat-sidebar.tsx`)
- Added `selectedTopic` and `onTopicChange` props
- Added `Badge` component import from `@/components/ui/badge`
- Added `BookOpen` icon from lucide-react
- Created topic selection UI with:
  - Grid layout of 8 topic buttons
  - Visual feedback for selected topic (primary color, checkmark badge)
  - Hover effects for better UX
  - Positioned above "Powered by RAG" section

### 3. AI Chat Interface (`components/ai-chat-interface.tsx`)
- Added `selectedTopic` prop to interface
- Added `tSidebar` translation hook for sidebar translations
- Added visual badge showing active topic on welcome screen (only if not "general")
- Badge displays: "Topic Focus: [Selected Topic]"

### 4. AI Chat Hook (`hooks/use-ai-chat.ts`)
- Added `focusTopic` parameter to `UseAIChatOptions` interface
- Added `focusTopic` parameter to hook with default value "general"
- Updated `sendMessageMutation` to pass `focusTopic` to Convex action

### 5. Convex Action (`convex/actions.ts`)
- Updated `createRAGSystemPrompt` function:
  - Added `focusTopic` optional parameter
  - Created `topicFocusMap` with focus instructions for each topic (bilingual)
  - Integrated topic focus into system prompt
- Updated `askAI` action:
  - Added `focusTopic` optional parameter to args
  - Added default value "general"
  - Added topic to logging
  - Passed `focusTopic` to `createRAGSystemPrompt`

### 6. Page Client Component (`app/[locale]/ask-ai/ask-ai-page-client.tsx`)
- Added `selectedTopic` state with default "general"
- Passed `focusTopic` to `useAIChat` hook
- Passed `selectedTopic` and `onTopicChange` to `AIChatSidebar`
- Passed `selectedTopic` to `AIChatInterface`

## How It Works

1. **User selects a topic** in the sidebar (e.g., "Carbon Trading & Credits")
2. **State updates** in the page client component
3. **Hook receives topic** and passes it to Convex action with each message
4. **System prompt is enhanced** with topic-specific focus instructions
5. **LLM generates responses** with more focused content on the selected topic
6. **Visual indicator** shows active topic on welcome screen

## Topic Focus Instructions

Each topic adds specific guidance to the AI system prompt:

- **General**: Comprehensive overviews of carbon markets and sustainability
- **Trading**: Trading mechanisms, credit systems, market dynamics
- **Policy**: Climate policies, regulatory frameworks, government regulations
- **Projects**: Carbon offset projects, methodologies, project development
- **Accounting**: Carbon accounting methods, reporting standards, measurement
- **Compliance**: Compliance markets, mandatory schemes, regulatory requirements
- **Voluntary**: Voluntary carbon markets, certification standards, voluntary programs
- **Technology**: Carbon capture technologies, technological solutions, innovation

## Benefits

1. **More Focused Responses**: Users get more relevant answers for their specific interest area
2. **Better User Experience**: Clear visual feedback on selected topic
3. **Contextual Awareness**: AI understands user's area of interest
4. **Flexibility**: Users can switch topics at any time
5. **Bilingual Support**: All topics and instructions work in both English and Vietnamese

## Future Enhancements

- Add topic-based example questions
- Track topic selection analytics
- Suggest topic based on conversation context
- Add topic-specific follow-up questions
