import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F3F6F4",       // abu-hijau kabut sungai
        ink: "#122320",      // teks utama, hitam kehijauan
        teal: {
          DEFAULT: "#14555C", // biru-hijau air sungai, warna utama
          light: "#2C7A82",
          dark: "#0D3A3F",
        },
        sediment: "#C1793B", // coklat lumpur/sedimen, dipakai untuk data & angka
        alert: "#B4442E",    // merah-bata, khusus status bahaya/threshold breach
        line: "#D9E0DC",     // garis pembatas tipis
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
