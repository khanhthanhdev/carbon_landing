# Phase 06: Footer Redesign

**Priority:** Medium
**Status:** Complete
**File:** `components/footer.tsx`

## Overview

Upgrade the footer from a simple 2-column layout to a richer institutional footer with a green accent top bar, better visual hierarchy, and a clean bottom bar.

## Current State

- Dark foreground (`bg-foreground`) background — near black
- 2 columns: Brand | Contact
- Simple bottom bar with copyright + links

## Target State

```
┌────────────────────────────────────────────────────────────────────┐
│  ████████████████████████████████████████████ ← 4px green bar     │
│                                                                    │
│  🌿 CarbonLearn          Quick Links       Contact                 │
│  Carbon Markets Platform                                           │
│                          Books             📧 email               │
│  Description text...     Search            📞 phone               │
│                          Ask AI            📍 address             │
│                          About                                     │
│  ─────────────────────────────────────────────────────────────     │
│  © 2025 CarbonLearn · VinUniversity   Privacy · Terms · Cookies   │
└────────────────────────────────────────────────────────────────────┘
```

## Design Changes

- **Top accent bar:** 4px `bg-[#00c864]` bar across full width at the very top of the footer
- **Background:** Keep `bg-foreground` (dark) — it looks institutional
- **Layout:** Upgrade from 2-col to 3-col grid: Brand | Quick Links | Contact
  - `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- **Brand column:**
  - Keep Leaf icon + CarbonLearn name
  - Add subtitle: "Carbon Markets Platform" in `text-background/50 text-xs`
  - Keep description
- **Quick Links column (new):** Add navigation links block
  - Title: "Quick Links" (translated)
  - Links: Books, Search, Ask AI, About — reusing `Link` component
- **Contact column:** Keep as-is, minor spacing tweak
- **Bottom bar:** Add `bg-foreground/20` separator line, keep copyright + links

## Implementation Steps

1. Read `components/footer.tsx`
2. Add `import { Link } from "@/lib/navigation"` if not already imported
3. Add green accent bar as first child of `<footer>`: `<div className="h-1 w-full bg-[#00c864]" />`
4. Update inner grid from `grid-cols-1 sm:grid-cols-2` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
5. Add brand subtitle under brand name
6. Insert Quick Links column between brand and contact:
   ```tsx
   <div>
     <h3 className="mb-3 font-semibold text-base sm:mb-4 sm:text-lg">{t("links.title")}</h3>
     <ul className="space-y-2 text-xs sm:space-y-3 sm:text-sm">
       <li><Link className="text-background/80 transition-colors hover:text-background" href="/books">{t("links.books")}</Link></li>
       <li><Link className="text-background/80 transition-colors hover:text-background" href="/search">{t("links.search")}</Link></li>
       <li><Link className="text-background/80 transition-colors hover:text-background" href="/ask-ai">{t("links.askAI")}</Link></li>
       <li><Link className="text-background/80 transition-colors hover:text-background" href="/about-us">{t("links.about")}</Link></li>
     </ul>
   </div>
   ```
7. Add translation keys for `footer.links.*` to `messages/vi.json` and `messages/en.json`

## i18n Keys to Add

**`messages/en.json`** under `"footer"`:
```json
"links": {
  "title": "Quick Links",
  "books": "Books",
  "search": "Search",
  "askAI": "Ask AI",
  "about": "About Us"
}
```

**`messages/vi.json`** under `"footer"`:
```json
"links": {
  "title": "Liên kết nhanh",
  "books": "Sách",
  "search": "Tìm kiếm",
  "askAI": "Hỏi AI",
  "about": "Về chúng tôi"
}
```

## Success Criteria

- Green 4px top bar visible on footer
- 3-column layout on desktop
- Quick Links column renders with correct translated links
- Brand subtitle visible
- Bottom bar unchanged in function
- No broken translation keys
