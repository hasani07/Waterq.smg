"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Menu } from "lucide-react";
import { supabase, DevicePublic } from "@/lib/supabase";
import ThemeToggle from "./ThemeToggle";

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [devices, setDevices] = useState<DevicePublic[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("devices_public").select("*").order("device_code");
      setDevices((data ?? []) as DevicePublic[]);
    })();
    loadUnreadCount();

    // Dengerin perubahan apapun di tabel notifications (baru masuk, atau ditandai dibaca
    // dari halaman Alerts) biar angka di lonceng ini selalu ke-update tanpa perlu refresh.
    const channel = supabase
      .channel("notifications-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => loadUnreadCount(),
      )
      .subscribe();

    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadUnreadCount() {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);
    setUnreadCount(count ?? 0);
  }

  const filtered = devices.filter(
    (d) =>
      query.length > 0 &&
      (d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.device_code.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="glass-card mb-6 flex items-center gap-3 px-4 py-3 md:gap-4 md:px-5">
      <button
        onClick={onMenuClick}
        className="glass-pill flex h-9 w-9 shrink-0 items-center justify-center text-ink/70 lg:hidden"
        aria-label="Buka menu"
      >
        <Menu size={17} />
      </button>

      <div ref={wrapperRef} className="relative min-w-0 flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"
        />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Cari stasiun, parameter, atau menu..."
          className="w-full bg-transparent py-1.5 pl-9 pr-3 font-body text-sm text-ink outline-none placeholder:text-ink/40"
        />
        {showResults && filtered.length > 0 && (
          <div className="glass-card absolute left-0 top-full z-20 mt-2 w-full overflow-hidden py-2">
            {filtered.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setQuery("");
                  setShowResults(false);
                  router.push(`/?device=${d.id}`);
                }}
                className="flex w-full items-center justify-between px-4 py-2 text-left font-body text-sm text-ink/80 hover:bg-teal/10 hover:text-teal"
              >
                <span>{d.name}</span>
                <span className="text-xs text-ink/40">{d.device_code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => router.push("/alerts")}
        className="glass-pill relative flex h-9 w-9 items-center justify-center text-ink/70 hover:text-teal"
        aria-label="Notifikasi"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-alert font-body text-[9px] text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <ThemeToggle />
    </div>
  );
}
