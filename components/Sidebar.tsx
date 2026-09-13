"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  LineChart,
  Bell,
  Sparkles,
  Cpu,
  UploadCloud,
  Settings2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Logo from "./Logo";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stasiun", label: "Stasiun", icon: MapPin },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/ai-insight", label: "AI Insight", icon: Sparkles },
  { href: "/devices", label: "Devices", icon: Cpu },
  { href: "/firmware", label: "Firmware", icon: UploadCloud },
  { href: "/system", label: "System", icon: SlidersHorizontal },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export default function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop -- cuma muncul di mobile pas sidebar dibuka */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`glass-card fixed inset-y-3 left-3 z-50 flex w-64 flex-col px-4 py-6 transition-transform duration-300 lg:sticky lg:inset-auto lg:left-auto lg:top-4 lg:z-auto lg:h-[calc(100vh-2rem)] lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-[120%]"
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <Logo size={34} />
          <button
            onClick={onClose}
            className="text-ink/50 hover:text-ink lg:hidden"
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm transition-colors ${
                  isActive
                    ? "bg-teal text-white"
                    : "text-ink/60 hover:bg-teal/10 hover:text-teal"
                }`}
              >
                <Icon size={17} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl bg-teal/10 px-3 py-3">
          <p className="font-body text-xs text-teal">Air Bersih,</p>
          <p className="font-body text-xs text-teal">Masa Depan Lebih Baik</p>
        </div>
      </aside>
    </>
  );
}
