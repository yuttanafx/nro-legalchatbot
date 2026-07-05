/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B2430",      // near-black navy for text
        paper: "#F6F5F1",    // warm off-white background
        moss: "#3A5A44",     // deep green - primary accent (trust, growth, NGO)
        moss_dark: "#2A4433",
        clay: "#B5654A",     // muted terracotta - warnings/sensitive flags (desaturated, not the AI-default orange)
        line: "#E1DED4",     // hairline borders
        muted: "#6B7280"
      },
      fontFamily: {
        display: ["'IBM Plex Serif'", "serif"],
        sans: ["'IBM Plex Sans Thai'", "'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"]
      }
    }
  },
  plugins: []
};
