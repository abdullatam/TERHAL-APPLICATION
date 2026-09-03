/** @type {import('tailwindcss').Config} */

/**
 * Terhal design system — the single source of colour for the app.
 *
 * These are the official brand hex values from the Claude Design export, not
 * the old `sand`/`rose` scales. The old scales are gone rather than aliased:
 * two overlapping colour systems is how a palette drifts.
 *
 * The six brand colours are named exactly as the brand sheet names them. The
 * `ink`/`support` values are the greys and tints the design files actually use
 * for secondary text and card stacks — they were in the export but unnamed, so
 * they are collected here instead of being scattered as raw hex.
 */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // --- official brand palette ---
        terracotta: {
          DEFAULT: "#B2543A",
          hover: "#8E4230", // from the export's `a:hover`
        },
        brown: "#3A2A21",
        sandstone: "#D9B28C",
        beige: "#F2E7DA",
        ivory: "#FAF6F2",
        gray: "#E7E2DA",

        // --- secondary text ramp, as used across the export ---
        ink: {
          body: "#5C4A3E", // onboarding body copy
          muted: "#7A6959", // card subtitles
          soft: "#9A8B7E", // inactive tab, "Skip", disabled glyphs
          stamp: "#4A362A", // photo-placeholder captions
        },

        // --- surface tints (card stack, thumbnails, timeline rail) ---
        tint: {
          100: "#E8D3BC",
          200: "#E3CDB2",
          300: "#E3C7A8",
          400: "#DFC4A6",
          rail: "#E7DBC9",
        },

        // --- the one semantic colour in the export (booked / confirmed) ---
        success: {
          DEFAULT: "#10B981",
          ink: "#0B7355",
        },
      },
      fontFamily: {
        // Poppins has no Arabic glyphs, so Noto Sans Arabic is not a fallback
        // of convenience — it carries every Arabic string in the app.
        sans: ["Poppins", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        arabic: ["'Noto Sans Arabic'", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      backgroundImage: {
        // Reserved for Splash and the Passport progress fill only.
        "terhal-gradient": "linear-gradient(168deg,#B2543A 0%,#BE6949 45%,#D9B28C 100%)",
        "terhal-progress": "linear-gradient(90deg,#B2543A,#D9B28C)",
        // The export uses a diagonal hatch wherever a photograph will go.
        hatch:
          "repeating-linear-gradient(135deg,#E3C7A8 0 11px,#D9B28C 11px 22px)",
        "hatch-sm":
          "repeating-linear-gradient(135deg,#E3C7A8 0 8px,#D9B28C 8px 16px)",
        "hatch-alt":
          "repeating-linear-gradient(135deg,#E8D3BC 0 8px,#DFC4A6 8px 16px)",
      },
      boxShadow: {
        card: "0 22px 40px -22px rgba(58,42,33,.6)",
        lockup: "0 22px 44px -18px rgba(58,42,33,.4)",
        cta: "0 12px 24px -10px rgba(178,84,58,.8)",
        toast: "0 14px 34px -14px rgba(58,42,33,.45)",
        // The export draws card edges as a 1px ring, not a border.
        hairline: "0 0 0 1px #E7E2DA",
      },
      borderRadius: {
        frame: "24px",
      },
    },
  },
  plugins: [],
};
