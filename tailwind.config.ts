import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semua warna ini dibaca dari CSS variable (lihat globals.css),
        // jadi otomatis ganti pas dark mode aktif TANPA perlu ubah kode
        // di komponen manapun -- termasuk yang pakai opacity kayak text-ink/70.
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        teal: {
          DEFAULT: "rgb(var(--color-teal) / <alpha-value>)",
          light: "rgb(var(--color-teal-light) / <alpha-value>)",
          dark: "rgb(var(--color-teal-dark) / <alpha-value>)",
        },
        sediment: "rgb(var(--color-sediment) / <alpha-value>)",
        alert: "rgb(var(--color-alert) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-ibm-plex)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
