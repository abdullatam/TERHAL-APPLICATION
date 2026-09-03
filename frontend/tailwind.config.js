/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Petra sandstone: warm neutrals with a rose-red accent.
        sand: {
          50: "#FBF8F4",
          100: "#F5EFE7",
          200: "#E8DCCC",
          300: "#D6C3AA",
          400: "#BCA184",
          500: "#A08466",
          600: "#7F664D",
          700: "#5F4B39",
          800: "#403327",
          900: "#2B221A",
        },
        rose: {
          50: "#FDF3F0",
          100: "#FAE3DC",
          200: "#F2C2B4",
          300: "#E59B85",
          400: "#D27054",
          500: "#B2543A",
          600: "#94422C",
          700: "#733322",
          800: "#52251A",
          900: "#331711",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto",
          "Noto Sans Arabic", "Helvetica Neue", "Arial", "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 10px 30px -10px rgba(43, 34, 26, 0.35)",
        sheet: "0 -8px 30px -12px rgba(43, 34, 26, 0.30)",
      },
    },
  },
  plugins: [],
};
