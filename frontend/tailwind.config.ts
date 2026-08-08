import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#4338CA", dark: "#3730A3", light: "#EEF2FF" },
        ink: "#1E1B2E",
        paper: "#F8F7FC",
        ok: "#15803D",
        warn: "#B45309",
        danger: "#B91C1C",
      },
      borderRadius: { DEFAULT: "8px", lg: "12px" },
    },
  },
  plugins: [],
};
export default config;
