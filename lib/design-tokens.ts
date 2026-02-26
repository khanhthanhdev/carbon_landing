/**
 * Design Tokens inspired by Singapore Green Finance
 * Colors, typography, spacing, and shadows
 */

export const designTokens = {
  colors: {
    // Primary palette
    primary: {
      dark: "#0c3732", // Deep teal
      light: "#97e9c0", // Light mint
      accent: "#00c864", // Bright green
    },
    // Neutral palette
    neutral: {
      900: "#000000",
      800: "#111111",
      700: "#333333",
      600: "#7e7e7e",
      100: "#ffffff",
    },
    // Interactive states
    interactive: {
      hover: "#3ba1da", // Blue on hover
      focus: "#003aff", // Primary blue
      error: "#cf2e2e", // Red
    },
    // Semantic
    success: "#00c864",
    warning: "#cf2e2e",
  },

  typography: {
    fontFamily: {
      primary: "Helvetica, Arial, sans-serif",
      display: '"Para Supreme", Helvetica, Arial, sans-serif',
    },
    fontSize: {
      xs: "12px",
      sm: "14px",
      base: "16px",
      lg: "18px",
      xl: "20px",
      "2xl": "23px",
      "3xl": "24px",
      "4xl": "30px",
      "5xl": "32px",
      "6xl": "35px",
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: "1.00",
      normal: "1.33",
      relaxed: "1.50",
      loose: "1.67",
    },
  },

  spacing: {
    0: "0px",
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
  },

  borderRadius: {
    none: "0px",
    sm: "4px",
    md: "8px",
    lg: "10px",
    full: "100px",
  },

  shadows: {
    sm: "rgba(50, 50, 93, 0.11) 0px 2px 3px, rgba(0, 0, 0, 0.08) 0px 1px 1px",
    md: "rgba(50, 50, 93, 0.11) 0px 4px 6px, rgba(0, 0, 0, 0.08) 0px 1px 3px",
    lg: "rgba(50, 50, 93, 0.11) 0px 6px 12px, rgba(0, 0, 0, 0.08) 0px 2px 4px",
  },

  transitions: {
    fast: "150ms ease-in-out",
    normal: "300ms ease-in-out",
    slow: "500ms ease-in-out",
  },
} as const;

export type DesignTokens = typeof designTokens;
