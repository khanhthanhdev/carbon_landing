# Tech Stack

## Core Framework
- **Next.js 15.2.4** with App Router and React 19
- **TypeScript** with relaxed strictness (strict: false)
- **Convex** for backend (database, queries, mutations, actions)

## Key Libraries
- **UI**: Radix UI components, shadcn/ui patterns, Tailwind CSS 4
- **Internationalization**: next-intl with locales ['en', 'vi'], default 'vi'
- **AI/ML**: Google Gemini (@google/genai) for embeddings and chat, @convex-dev/rag for RAG patterns
- **State Management**: @tanstack/react-query, @convex-dev/react-query
- **Forms**: react-hook-form with @hookform/resolvers and zod validation
- **Styling**: Tailwind CSS 4, tailwind-merge, class-variance-authority, lucide-react icons

## Path Aliases
- `@/*` maps to project root
- Convex types imported from node_modules paths

## Common Commands

### Development
```bash
pnpm dev          # Start Next.js dev server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

### Data Migration
```bash
pnpm migrate                # Import data
pnpm migrate:qa             # Migrate Q&A data
pnpm migrate:embeddings     # Generate embeddings
pnpm migrate:stats          # Generate embeddings with stats
```

## Build Configuration
- ESLint and TypeScript errors ignored during builds
- Images unoptimized
- Module resolution: bundler
- Target: ES6
