# Agent Guidelines for CarbonLearn

## Build/Lint/Test Commands
- `pnpm dev` - Start Next.js dev server (next dev)
- `pnpm build` - Build for production (next build)
- `pnpm start` - Start production server (next start)
- `pnpm lint` - Run ESLint (next lint)
- Migration: `pnpm migrate:embeddings` - Generate embeddings for search

## Architecture Overview
- **Frontend**: Next.js 15 App Router with locale-based routing ([locale]/*)
- **Backend**: Convex (queries, mutations, actions, vector search)
- **Database**: Convex tables (qa, questions, feedback, searchCache, embeddingCache, conversations)
- **AI**: Google Gemini for embeddings (768d) and chat responses
- **UI**: shadcn/ui + Radix UI + Tailwind CSS 4
- **i18n**: next-intl with Vietnamese/English locales

## Code Style Guidelines
- **Path Aliases**: Use `@/` for imports (configured in tsconfig.json)
- **Client Components**: Add `'use client'` directive at top for browser APIs
- **Styling**: Use `cn()` utility from `@/lib/utils` for Tailwind class merging
- **UI Components**: Follow shadcn/ui patterns (forwardRef, cva variants, Radix primitives)
- **TypeScript**: Relaxed strictness (strict: false), use existing types from schema
- **Error Handling**: Console logging for debugging, no strict error boundaries
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Imports**: Group external libs, then internal (@/ paths), sort alphabetically
