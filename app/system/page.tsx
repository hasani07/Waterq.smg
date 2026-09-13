"use client";

import PinGate from "@/components/PinGate";
import DatabasePanel from "@/components/DatabasePanel";
import SerialMonitorPanel from "@/components/SerialMonitorPanel";

export default function SystemPage() {
  return (
    <main>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink">System</h1>
        <p className="mt-2 font-body text-sm text-ink/60">
          Kesehatan database, backup otomatis, dan serial monitor jarak jauh. Dilindungi PIN.
        </p>
      </div>
      <PinGate>
        {(token) => (
          <div className="flex flex-col gap-6">
            <DatabasePanel token={token} />
            <SerialMonitorPanel token={token} />
          </div>
        )}
      </PinGate>
    </main>
  );
}
