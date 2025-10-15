# Project Structure

## Core Directories

### `/app`
Next.js App Router structure with locale-based routing
- `[locale]/` - Locale-specific pages (en, vi)
- `api/` - API routes
- `layout.tsx` - Root layout (re-exports from locale layout)
- `providers.tsx` - Client-side providers

### `/components`
React components following shadcn/ui patterns
- `ui/` - Base UI components (Radix UI wrappers)
- Feature components: navigation, hero, search, AI assistant, feedback forms
- All components use "use client" directive when needed

### `/convex`
Convex backend code
- `schema.ts` - Database schema definitions
- `queries/` - Query functions
- `mutations/` - Mutation functions
- `actions.ts` - Server actions (AI, embeddings, migrations)
- `_generated/` - Auto-generated Convex types

### `/lib`
Utility functions and shared logic
- `utils.ts` - Common utilities (cn helper)
- `ai/` - AI integration (Gemini)
- `server/` - Server-side utilities
- `convex-server.ts` - Convex server helpers

### `/hooks`
Custom React hooks
- `use-toast.ts`, `use-mobile.ts`, `use-debounce.ts` - UI utilities
- `use-questions.ts`, `use-semantic-search.ts` - Data fetching
- `use-recommended-book.ts` - Content fetching

### `/i18n`
Internationalization configuration
- `request.ts` - next-intl config, locale definitions

### `/messages`
Translation files (JSON)
- `en.json`, `vi.json` - Translations for each locale

### `/data`
Static data files
- Q&A content in JSON and Markdown formats
- Source data for migrations

### `/scripts`
Data migration and embedding generation scripts
- TypeScript scripts for importing and processing Q&A data

### `/docs`
Documentation
- `specs/` - Feature specifications
- Implementation guides for embeddings, actions, semantic search

### `/public`
Static assets (images, placeholders)

## Key Patterns

### Convex Schema
Tables: `qa`, `questions`, `questionRequests`, `feedback`, `searchCache`, `embeddingCache`, `landingContent`
- Vector indexes for semantic search (768 dimensions)
- Search indexes for text search
- Regular indexes for filtering

### Component Conventions
- Use `cn()` utility for className merging
- Radix UI components wrapped in `/components/ui`
- Client components marked with "use client"
- Server components by default

### Internationalization
- Middleware handles locale routing
- `useTranslations()` hook for translations
- `useLocale()` hook for current locale
- Default locale: 'vi'

### AI Integration
- Embeddings cached in `embeddingCache` table
- Search results cached in `searchCache` table
- Rate limiting via batch processing with delays
- Gemini API for embeddings (768d) and chat
