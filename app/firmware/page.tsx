"use client";

import PinGate from "@/components/PinGate";
import OtaPanel from "@/components/OtaPanel";

export default function FirmwarePage() {
  return (
    <main>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink">Firmware</h1>
        <p className="mt-2 font-body text-sm text-ink/60">
          Upload firmware OTA dan lihat riwayat ter-flash ke tiap device. Dilindungi PIN.
        </p>
      </div>
      <PinGate>{(token) => <OtaPanel token={token} />}</PinGate>
    </main>
  );
}
