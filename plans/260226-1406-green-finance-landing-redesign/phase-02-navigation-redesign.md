# Phase 02: Navigation Redesign

**Priority:** High
**Status:** Complete
**File:** `components/navigation.tsx`

## Overview

Transform the navigation from a minimal transparent bar to an institutional-quality header. Style it like UNFCCC or Climate Bonds Initiative — authoritative, clean, with a clear CTA button.

## Current State

- Logo + text brand left
- Plain text links center/right
- No CTA button
- Transparent → blurred white on scroll

## Target State

```
┌─────────────────────────────────────────────────────────────────────┐
│ [🌿 CarbonLearn]     Books  Search  Ask AI  About  FAQ  Contact    [Explore →] │
└─────────────────────────────────────────────────────────────────────┘
```

- **Logo area:** Logo image + brand name, with a subtle left border accent or leaf icon
- **Links:** Slightly smaller, all-caps tracking, spaced out more
- **CTA button:** Solid deep-green pill button "Explore Platform →" linking to `/books`
- **Scrolled state:** White bg with a fine `border-b border-primary/20` bottom line
- **Logo brand text:** Add a subtitle tag "Carbon Markets Platform" below brand name in tiny muted text (hidden on mobile)

## Implementation Steps

1. Read current `components/navigation.tsx`
2. Add `border-b border-primary/20` to the scrolled state class
3. Add a CTA `Button` component (variant default, size sm) at the end of the desktop nav links
4. Style nav links: add `text-xs uppercase tracking-wider font-medium` + `text-foreground/70 hover:text-primary`
5. Add subtitle text below brand name on desktop only
6. Mobile menu: unchanged structure, add CTA as a final item
7. Keep all translation keys intact — only change className strings

## Key Class Changes

```tsx
// Nav links — replace className
"text-foreground transition-colors hover:text-primary"
→
"text-xs font-medium uppercase tracking-wider text-foreground/70 transition-colors hover:text-primary"

// Brand subtitle (new, desktop only)
<span className="hidden text-xs text-muted-foreground tracking-wide lg:block">
  Carbon Markets Platform
</span>

// CTA button (new)
<Button size="sm" className="ml-2 hidden md:flex bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm px-5">
  {t("cta")} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
</Button>

// Scrolled state border
isScrolled ? "bg-background/95 shadow-sm backdrop-blur-md border-b border-primary/15" : "bg-transparent"
```

## i18n

Add `"cta": "Explore Platform"` key to navigation translations in:
- `messages/vi.json`
- `messages/en.json`

(Check existing keys first to avoid duplicates)

## Success Criteria

- Nav renders with CTA button on desktop
- Scroll behavior: white bg + bottom border line
- Mobile menu remains functional
- Brand subtitle visible on lg+
- All translation keys preserved
