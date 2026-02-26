# Phase 01: CSS Design Token Overhaul

**Priority:** Critical (blocks all other phases)
**Status:** Complete
**File:** `app/globals.css`

## Overview

Update CSS custom properties in `globals.css` to reflect an international green finance organization palette. The existing tokens are already green-tinted but too muted/generic. We need bolder institutional greens.

## Design System Changes

### Light Mode Tokens

| Token | Current | New | Notes |
|-------|---------|-----|-------|
| `--background` | `oklch(0.98 0.01 140)` | `oklch(0.985 0.004 145)` | Cleaner near-white |
| `--foreground` | `oklch(0.25 0.02 160)` | `oklch(0.15 0.04 155)` | Deeper, more contrast |
| `--primary` | `oklch(0.45 0.15 155)` | `oklch(0.30 0.12 155)` | Deep forest green |
| `--primary-foreground` | `oklch(0.98 0.01 140)` | `oklch(0.98 0.005 145)` | White |
| `--secondary` | `oklch(0.55 0.12 85)` | `oklch(0.65 0.20 148)` | Bright accent green |
| `--secondary-foreground` | `oklch(0.98 0.01 140)` | `oklch(0.10 0.04 155)` | Dark text on bright green |
| `--muted` | `oklch(0.94 0.01 140)` | `oklch(0.95 0.008 145)` | Light sage |
| `--muted-foreground` | `oklch(0.5 0.02 160)` | `oklch(0.45 0.03 155)` | Warmer muted text |
| `--accent` | `oklch(0.4 0.1 180)` | `oklch(0.65 0.20 148)` | Bright green accent |
| `--accent-foreground` | `oklch(0.98 0.01 140)` | `oklch(0.10 0.04 155)` | Dark on accent |
| `--border` | `oklch(0.88 0.01 140)` | `oklch(0.90 0.012 145)` | Subtle green-tinted border |
| `--card` | `oklch(1 0 0)` | `oklch(1 0 0)` | Pure white cards |
| `--radius` | `0.75rem` | `0.375rem` | Sharper corners (institutional) |

### Dark Mode Tokens

Keep dark mode mostly unchanged but align primary to same forest green family:
| Token | New |
|-------|-----|
| `--primary` | `oklch(0.55 0.18 155)` |
| `--secondary` | `oklch(0.70 0.22 148)` |

## Additional Global CSS

Add institutional-style utility classes:
```css
/* Green accent divider line */
.section-divider {
  @apply h-1 w-16 bg-primary rounded-full;
}

/* Badge style for section labels */
.section-label {
  @apply inline-flex items-center gap-2 rounded-none border-l-4 border-primary
         pl-3 font-semibold text-sm uppercase tracking-widest text-primary;
}
```

## Implementation Steps

1. Open `app/globals.css`
2. Replace `:root` block CSS variables per table above
3. Update `.dark` block primary/secondary tokens
4. Change `--radius` from `0.75rem` to `0.375rem`
5. Add utility classes `.section-divider` and `.section-label` to `@layer base` or `@layer utilities`
6. Verify no syntax errors

## Success Criteria

- Build passes (`pnpm build` or compile check)
- Colors look visibly deeper/more institutional when browsing
- No broken references to old token values
