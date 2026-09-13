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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass-card sticky top-4 flex h-[calc(100vh-2rem)] w-64 flex-col px-4 py-6">
      <div className="px-2">
        <Logo size={34} />
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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
  );
}
