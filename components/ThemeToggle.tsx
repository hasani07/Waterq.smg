"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("waterq-theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Ganti tema terang/gelap"
      className="glass-pill flex h-9 w-9 items-center justify-center text-ink/70 transition-colors hover:text-teal"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
