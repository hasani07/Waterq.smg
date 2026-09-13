"use client";

import PinGate from "@/components/PinGate";
import DeviceListPanel from "@/components/DeviceListPanel";
import DeviceInfoPanel from "@/components/DeviceInfoPanel";

export default function DevicesPage() {
  return (
    <main>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink">Devices</h1>
        <p className="mt-2 font-body text-sm text-ink/60">
          Kelola identitas, lokasi, dan info SIM tiap device. Dilindungi PIN.
        </p>
      </div>
      <PinGate>
        {(token) => (
          <div className="flex flex-col gap-6">
            <DeviceListPanel token={token} />
            <DeviceInfoPanel token={token} />
          </div>
        )}
      </PinGate>
    </main>
  );
}
