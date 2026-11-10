import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        samsung: {
          navy: "#1428A0",
          blue: "#0066FF",
          sky: "#E8F0FE",
          light: "#F4F6FA",
          dark: "#0B1536",
          charcoal: "#1C1E21",
          cyan: "#00C3FF",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-samsung)",
          "Plus Jakarta Sans",
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      borderRadius: {
        "oneui": "26px",
        "pill": "9999px",
      },
      boxShadow: {
        "oneui": "0 8px 30px rgba(20, 40, 160, 0.08)",
        "gojek-sheet": "0 -8px 36px rgba(11, 21, 54, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
