import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // New color palette: beige, taupe, sage
        mnee: {
          50: "#f5f2f0",    // lightest beige
          100: "#ebe6e3",   // lighter beige
          200: "#ddd5d0",   // light beige
          300: "#cfc0bd",   // taupe
          400: "#c0b3ad",   // medium taupe
          500: "#b8b8aa",   // sage gray
          600: "#7f9183",   // sage green
          700: "#6b7d73",   // darker sage
          800: "#586f6b",   // dark teal
          900: "#3d4f4d",   // darkest teal
        },
        // Brand colors for semantic usage
        brand: {
          light: "#ddd5d0",
          medium: "#b8b8aa",
          dark: "#586f6b",
          accent: "#7f9183",
        },
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        display: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
      },
      fontWeight: {
        normal: "500",
        medium: "600",
        semibold: "700",
        bold: "800",
      },
    },
  },
  plugins: [],
} satisfies Config;
