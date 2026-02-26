# Phase 03: Hero Section Redesign

**Priority:** High
**Status:** Complete
**File:** `components/hero.tsx`

## Overview

The hero is the most impactful visual change. Transform from a centered minimal layout to a two-column institutional hero with a strong green accent bar, authoritative headline, and a subtle background pattern.

## Current State

- Full-height centered text column
- Simple gradient background
- Three CTA buttons in a row
- Stats row below

## Target State

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐   │
│  │                          │  │  CARBON MARKETS TRAINING     │   │
│  │   [Book Cover / Hero     │  │  ──────────────────────────  │   │
│  │    Visual Placeholder]   │  │  The authoritative knowledge │   │
│  │                          │  │  platform for carbon market  │   │
│  │                          │  │  professionals in Vietnam    │   │
│  │                          │  │                              │   │
│  │                          │  │  [Read Book →] [Browse Q&A]  │   │
│  │                          │  │                              │   │
│  │                          │  │  ── 50+ Q&A  6 Topics  AI ── │   │
│  └──────────────────────────┘  └──────────────────────────────┘   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

On mobile: stacked, content first, image below.

## Visual Design Details

- **Background:** Deep forest green gradient `from-[oklch(0.18_0.06_155)] to-[oklch(0.24_0.08_150)]` with subtle dot-grid overlay
- **Text on hero:** White (`text-white`)
- **Badge:** Replaced with a left-border label — `border-l-4 border-[#00c864] pl-3 text-xs uppercase tracking-widest text-white/70`
- **H1:** Large white headline, 5xl→7xl, tight leading
- **Description:** `text-white/80` relaxed
- **Buttons:**
  - Primary: `bg-[#00c864] text-[#0c3732] hover:bg-[#00c864]/90 font-bold` — bright green
  - Secondary: `bg-transparent border-2 border-white/60 text-white hover:bg-white/10`
  - Tertiary (Ask AI): `bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm`
- **Stats row:** White text, dividers are `bg-white/20`
- **Right side image:** Book cover image displayed prominently with a subtle shadow/glow

## Structural Changes

### Layout shift: centered → two-column

```tsx
// Outer section: dark green background
<section className="relative flex min-h-screen items-center justify-center pt-16 bg-gradient-to-br from-[oklch(0.18_0.06_155)] to-[oklch(0.26_0.09_150)]">

  {/* Dot grid overlay */}
  <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

  <div className="container relative z-10 mx-auto px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20 items-center">

      {/* Left: Content */}
      <div className="order-2 lg:order-1">
        {/* Section label */}
        <div className="mb-6 border-l-4 border-[#00c864] pl-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/60">{t("badge")}</span>
        </div>

        <h1 className="mb-6 font-bold text-4xl text-white leading-tight tracking-tight sm:text-5xl md:text-6xl">
          {t("title")}
        </h1>

        <p className="mb-10 text-lg text-white/75 leading-relaxed sm:text-xl">
          {t("description")}
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          ...buttons...
        </div>
      </div>

      {/* Right: Book cover image */}
      <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
        <div className="relative">
          <div className="absolute -inset-4 rounded-2xl bg-[#00c864]/20 blur-2xl" />
          <Image src="/cover_vi.jpg" ... className="relative rounded-lg shadow-2xl max-w-[320px] lg:max-w-[420px]" />
        </div>
      </div>

    </div>

    {/* Stats bar */}
    <div className="mt-16 border-t border-white/15 pt-8">
      <StatsSection t={t} />
    </div>
  </div>
</section>
```

## StatsSection Updates

Change stat text colors to `text-white` and dividers to `bg-white/20`:
```tsx
<data className="mb-1 block font-bold text-3xl text-white sm:text-4xl">
<div className="text-white/60 text-sm">
<div aria-hidden="true" className="h-12 w-px bg-white/20" />
```

## i18n / Locale-Aware Image

Use `useLocale()` to show the right cover:
```tsx
const locale = useLocale();
const coverImage = locale === "en" ? "/cover_en.jpg" : "/cover_vi.jpg";
```

## Implementation Steps

1. Read `components/hero.tsx`
2. Add `useLocale` import from `next-intl`
3. Add `Image` import from `next/image`
4. Replace outer `<section>` className to deep green gradient + dot grid overlay
5. Restructure inner `<div>` from single column to 2-col grid
6. Move headline/description/buttons to left column (order-2 lg:order-1)
7. Add right column with book cover image + glow effect (order-1 lg:order-2)
8. Update button styles per design above
9. Update `StatsSection` text colors to white
10. Remove the old `UserGuideDialog` conditional state (keep if referenced elsewhere)

## Success Criteria

- Hero shows dark green full-height background
- Two-column layout on desktop, stacked on mobile
- Book cover prominently displayed
- Bright green primary CTA button
- Stats bar with white text readable against dark bg
- Mobile layout is correct (content above image)
