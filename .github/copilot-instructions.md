# Copilot instructions for CarbonLearn (carbon-training-landing)

This file tells AI coding agents how this repo is structured and what conventions to follow when making changes.

High-level summary
- Next.js (app router) project (next v15). Top-level app pages live in `app/` and use React Server/Client components.
- UI primitives live in `components/ui/` and feature Radix + Tailwind + cva patterns.
- App-level components live in `components/` (e.g. `navigation.tsx`, `hero.tsx`). Small, focused client components include a leading `'use client'` directive.
- Hooks live in `hooks/` (e.g. `use-toast.ts`) and some client state lives in small in-repo singletons (listeners + memory state).
- Data fixtures for Q&A live in `data/` (`qa.json`, `carbon-qa.json`).
- API routes use the app-directory server handlers under `app/api/*` and follow the form `export async function POST(request: Request) { ... }` returning `NextResponse`.

Essential developer commands
- Start dev server: `npm run dev` (runs `next dev`).
- Build: `npm run build` (runs `next build`).
- Start production server: `npm run start` (runs `next start`).
- Lint: `npm run lint` (runs `next lint`).
- Package manager: pnpm lockfile exists (`pnpm-lock.yaml`) but `package.json` scripts work with npm/yarn/pnpm if dependencies are installed.

Key conventions & patterns (explicit, concrete)
- Client vs Server components: files that need browser-only APIs include the exact string `'use client'` at top. Preserve or add it when moving code that accesses window/document/hooks.
- Path alias: use `@/` to import from project root (configured in `tsconfig.json`). Example: `import { cn } from '@/lib/utils'`.
- Styling: Tailwind utility classes + `cn()` helper from `lib/utils.ts` (uses `clsx` + `tailwind-merge`). Use `cva` for variants where present (see `components/ui/toast.tsx`).
- UI components: follow `components/ui/*` patterns — forward refs, export types, and group Radix primitives into small named exports (ToastProvider, ToastViewport, Toast, ToastTitle...). Use `VariantProps<typeof fooVariants>` when exposing variant props.
- Global toast API: use `hooks/use-toast.ts` for programmatic toasts (exports `toast` and `useToast`). When creating toasts in code, prefer `toast({ title, description })` or `const t = toast({...}); t.dismiss()`.
- API routes: validate JSON input early, return `NextResponse.json(...)`, and keep handlers small (the project uses simple console logging/simulated processing in `app/api/feedback/route.ts`).

Integration & external dependencies
- Vercel Analytics integrated in `app/layout.tsx` (`@vercel/analytics`).
- Radix UI used widely for primitives (`@radix-ui/*`). Follow Radix patterns for accessibility props.
- Fonts: Geist font helper used in `app/layout.tsx`.

Files to inspect when making changes (high ROI)
- `app/layout.tsx` — app shell, global CSS, analytics.
- `app/page.tsx` — top-level composition of homepage components.
- `components/ui/*` — authoritative UI patterns (forwardRef, cva, Radix primitives).
- `hooks/use-toast.ts` and `components/ui/toast.tsx` — example of cross-file contract (programmatic API + visual primitives).
- `lib/utils.ts` — `cn()` helper; use consistently for class names.
- `app/api/*` — show how server handlers expect/return data.

Behavioral guidance for edits
- Keep changes minimal and idiomatic: prefer adding new files under `components/` or `components/ui/` and reusing `cn()` and `cva`.
- Preserve `'use client'` when required. When converting a component to server-side, remove it intentionally and ensure no browser-only APIs remain.
- TypeScript: project is typed strictly; use existing types and export types from UI modules where helpful. TS config uses path alias `@/*`.
- Tests: none included. Don't add broad test infra without prior discussion.

Examples (explicit snippets to follow project patterns)
- Programmatic toast: import `toast` from `hooks/use-toast.ts` and call `toast({ title: 'Saved', description: 'Changes persisted.' })`.
- New UI component: create `components/ui/my-component.tsx`, follow forwardRef + export pattern used in `components/ui/toast.tsx`.

If you need more context
- Check `package.json` for installed libs and scripts.
- Search for `"use client"` to find client components that rely on browser APIs.

When unsure, ask the repository owner before:
- Adding or changing large runtime dependencies (e.g., new UI framework).
- Adding a global build/test infra (no tests currently).

Feedback
- If any instructions are unclear or a pattern is missing, please point to the relevant file and I'll iterate.
