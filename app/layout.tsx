import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "700"],
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-ibm-plex",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "WaterQ Semarang — Pemantauan Kualitas Air",
  description: "Dashboard pemantauan kualitas air sungai di Semarang secara real-time.",
};

// Script kecil ini jalan SEBELUM React hydrate, biar gak ada "kedipan" tema
// (misal user pilih dark mode, tapi pas reload sempat keliatan putih sekilas).
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('waterq-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored ? stored === 'dark' : prefersDark;
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${spaceGrotesk.variable} ${ibmPlex.variable} font-body`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
