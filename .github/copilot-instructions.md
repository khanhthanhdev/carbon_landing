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


# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `pnpm dlx ultracite fix` before committing to ensure compliance.
