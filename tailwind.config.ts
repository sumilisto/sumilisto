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
        brand: {
          DEFAULT: "var(--theme-brand)",
          hover: "var(--theme-brand-hover)",
          active: "var(--theme-brand-active)",
          50: "#fdf2f4",
          100: "#fbe6ea",
          200: "#f7cfd7",
          300: "#f0aab8",
          400: "#e47890",
          500: "#d34b6b",
          600: "#ba3152",
          700: "#9c2340",
          800: "#821f37",
          900: "var(--theme-brand)", // Primary brand color
          950: "var(--theme-brand-active)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        card: "0 4px 6px -1px rgba(89, 3, 23, 0.05), 0 2px 4px -2px rgba(89, 3, 23, 0.05)",
        float: "0 10px 15px -3px rgba(89, 3, 23, 0.1), 0 4px 6px -4px rgba(89, 3, 23, 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
