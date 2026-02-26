# Plan: Green Finance International Organization Landing Page Redesign

**Status:** Complete
**Branch:** main
**Priority:** High
**Plan Dir:** `plans/260226-1406-green-finance-landing-redesign/`

## Objective

Redesign the CarbonLearn landing page to match the professional aesthetic of an international organization focused on carbon markets and green finance — clean, institutional, green-themed, trustworthy.

## Design Direction

**Reference style:** Singapore Green Finance Centre, UNFCCC, ICAP, Climate Bonds Initiative
**Color palette:** Deep forest green (#0c3732), bright accent green (#00c864), off-white backgrounds, dark teal text
**Typography:** Clean sans-serif, generous whitespace, strong hierarchy
**Aesthetic:** Institutional authority + modern clarity — not startup-y

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | CSS Design Token Overhaul | Complete | [phase-01](./phase-01-css-design-token-overhaul.md) |
| 2 | Navigation Redesign | Complete | [phase-02](./phase-02-navigation-redesign.md) |
| 3 | Hero Section Redesign | Complete | [phase-03](./phase-03-hero-section-redesign.md) |
| 4 | Features/Future Section Redesign | Complete | [phase-04](./phase-04-future-section-redesign.md) |
| 5 | Sponsors/Organizations Section | Complete | [phase-05](./phase-05-sponsors-section-redesign.md) |
| 6 | Footer Redesign | Complete | [phase-06](./phase-06-footer-redesign.md) |

## Key Files to Modify

- `app/globals.css` — CSS variables (color tokens)
- `components/hero.tsx` — Hero section
- `components/navigation.tsx` — Navigation bar
- `components/future-section.tsx` — Features cards
- `components/sponsors-section.tsx` — Logos/org section
- `components/footer.tsx` — Footer
- `components/knowledge-overview.tsx` — Knowledge cards section
- `components/about-us-section.tsx` — About page (secondary)

## Design System

### Color Palette (OKLCH)
```
Forest Green (primary):  oklch(0.28 0.09 155)   → #0c3732 deep teal
Bright Green (accent):   oklch(0.72 0.22 148)   → #00c864 bright green
Background:              oklch(0.98 0.005 140)   → near-white with green tint
Foreground:              oklch(0.18 0.025 155)   → near-black with green tint
Muted bg:                oklch(0.95 0.01 145)    → light sage
```

### Typography
- Headings: Bold, tight tracking, large scale (6xl on desktop)
- Body: Regular weight, relaxed leading, muted foreground
- Badges/labels: Uppercase, wide tracking, small, primary green

### Component Style
- Cards: White bg, subtle border, 0px border-radius or 4px (sharp/institutional)
- Buttons: Solid green primary, white outline secondary
- Nav: Transparent → white on scroll, logo left, links right, CTA button
- Sections: Alternating white / very-light-green backgrounds
- Dividers: Thin green accent lines instead of HR

## Constraints
- No new dependencies
- Keep all i18n/translation hooks intact
- Do NOT change routing or page structure
- Maintain accessibility (ARIA labels, semantic HTML)
- No mock data — keep real data wiring
