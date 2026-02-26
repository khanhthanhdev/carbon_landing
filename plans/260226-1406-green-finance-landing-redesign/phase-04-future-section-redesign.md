# Phase 04: Features/Future Section & Knowledge Overview Redesign

**Priority:** Medium
**Status:** Complete
**Files:** `components/future-section.tsx`, `components/knowledge-overview.tsx`

## Overview

Redesign the features cards and knowledge overview to match the institutional green finance aesthetic: clean white cards, sharp corners, green icon accents, no purple/blue arbitrary colors.

---

## 4A: Future Section (Feature Cards)

### Current State
- Gradient background, cards with `border-2` and hover lift
- Hardcoded `text-blue-600`, `bg-blue-50`, `text-purple-600`, `bg-purple-50` icon colors
- Icons are commented out in code

### Target State

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────┐  │
│  │ ──                   │  │ ──                   │  │ ──     │  │
│  │ Continuous Updates   │  │ Semantic Search      │  │ AI     │  │
│  │                      │  │                      │  │        │  │
│  │ Description text...  │  │ Description text...  │  │        │  │
│  │                      │  │                      │  │        │  │
│  │ [Browse Library →]   │  │ [Search Now →]       │  │        │  │
│  └──────────────────────┘  └──────────────────────┘  └────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Design Changes

**Section background:** `bg-background` (white) instead of gradient
**Badge:** Replace `rounded-full bg-primary/10` badge with left-border style matching hero
**Section subtitle:** Keep as-is — already uses translations

**Cards:**
- `rounded-sm border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-primary/30`
- Remove `border-2`, use `border`
- Top accent: add a `3px` top border colored `border-t-4 border-t-primary` on hover → use `group-hover:border-t-primary`
- Re-enable icon: render icon with `text-primary bg-primary/10` color scheme (remove hardcoded blue/purple/green)
- Button: `variant="default"` → `bg-primary text-primary-foreground`

**Feature array update:** Remove per-feature `color` and `bgColor` hardcoded values, use unified primary theme:
```tsx
const features = [
  { icon: RefreshCw, title: ..., description: ..., href: ..., buttonText: ... },
  { icon: Search, ... },
  { icon: Bot, ... },
];
```

**Card className update:**
```tsx
<Card className="group flex h-full flex-col border border-border/60 rounded-sm p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40 sm:p-8">
  {/* Top accent bar */}
  <div className="mb-6 h-0.5 w-12 bg-primary transition-all duration-300 group-hover:w-20" />

  {/* Icon — re-enabled */}
  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-sm bg-primary/10">
    <Icon className="h-6 w-6 text-primary" />
  </div>
  ...
```

---

## 4B: Knowledge Overview Section

### Current State
- Gradient background `from-muted/30 via-background to-muted/20`
- Cards with `border-0 bg-card/80 shadow-lg backdrop-blur-sm`
- Badge pill with `bg-primary/10`
- Blur decorations

### Design Changes

**Background:** `bg-muted/30` — very light sage, flat (no gradient)
**Section badge:** Left-border style: `border-l-4 border-primary pl-3 text-sm font-semibold uppercase tracking-widest text-primary`
**Remove:** blur decorations (absolute positioned divs with blur), card `backdrop-blur-sm`
**Cards:**
```tsx
<Card className="group relative h-full overflow-hidden border border-border/60 rounded-sm bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30 sm:p-8">
  {/* Hover accent: animated left border */}
  <div className="absolute left-0 top-0 h-0 w-1 bg-primary transition-all duration-300 group-hover:h-full" />
```

**Q&A count badge:** Use `bg-primary/10 text-primary` instead of `bg-muted/80 text-muted-foreground`

**CTA button:** Keep as-is but ensure `rounded-sm` to match

---

## Implementation Steps

### Future Section
1. Read `components/future-section.tsx`
2. Change section background from gradient to `bg-background`
3. Replace badge style with left-border variant
4. Remove per-feature `color`/`bgColor` fields from features array
5. Update Card className per design
6. Add top accent bar div inside card
7. Re-enable icon block with unified `bg-primary/10` / `text-primary` styling
8. Ensure button is `variant="default"` (solid primary green)

### Knowledge Overview
1. Read `components/knowledge-overview.tsx`
2. Change section background to `bg-muted/30` flat
3. Remove absolute blur decoration divs
4. Replace badge with left-border style
5. Update Card className per design
6. Add animated left-border inside card
7. Update Q&A count badge colors

## Success Criteria

- Feature cards: white bg, no blue/purple colors, icon visible, green accent
- Knowledge cards: light sage bg, animated left border on hover, no blurs
- Both sections have consistent left-border section labels
- No hardcoded arbitrary colors (blue-600, purple-600) remain
