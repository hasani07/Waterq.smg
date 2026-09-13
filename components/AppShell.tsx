"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex gap-4 p-3 md:p-4">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 flex-1">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        {children}
      </div>
    </div>
  );
}
