# Phase 05: Sponsors Section Redesign

**Priority:** Medium
**Status:** Complete
**File:** `components/sponsors-section.tsx`

## Overview

Give the sponsors/organizations section an institutional feel — clean white background, centered logos with proper spacing, a subtle divider, and a section label consistent with other sections.

## Current State

- `bg-background` with `h2` "Đơn vị thực hiện" hardcoded (not translated)
- Simple flex row of images, no borders or cards around logos

## Target State

```
┌────────────────────────────────────────────────────────────────────┐
│                  IMPLEMENTING ORGANIZATIONS                        │
│                  ──────────────────────────                        │
│                                                                    │
│   ┌─────────────────────┐      ┌─────────────────────┐            │
│   │  [VinUniversity]    │      │  [British Council]  │            │
│   └─────────────────────┘      └─────────────────────┘            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Design Changes

- **Background:** `bg-background` → keep white, but add top `border-t border-border/40`
- **Section heading:** Replace hardcoded Vietnamese with a left-border label (keep bilingual via translations if key exists, otherwise use `t("organizations.title")` from `aboutUs` namespace)
- **Logo containers:** Wrap each logo in a styled card `border border-border/40 rounded-sm p-6 bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200`
- **Layout:** Keep flex row but use `gap-6 sm:gap-10` and constrain max-width to `max-w-4xl mx-auto`
- **Section padding:** Increase to `py-16 sm:py-20`

## Implementation Steps

1. Read `components/sponsors-section.tsx`
2. Add `border-t border-border/40` to section className
3. Replace `<h2>` with left-border section label div (using `t("organizations.title")`)
4. Add `mb-4 h-0.5 w-12 bg-primary` accent line below heading
5. Wrap each logo `<div>` in a card-styled container
6. Adjust logo dimensions to fit within card (keep `width={200} height={80}`)
7. Update gap and max-width

## Success Criteria

- Section has top border separator
- Section title uses translation key
- Each logo is inside a card with subtle hover effect
- Layout is responsive and centered
