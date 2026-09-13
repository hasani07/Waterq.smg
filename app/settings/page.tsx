"use client";

import Link from "next/link";
import PinGate from "@/components/PinGate";
import Logo from "@/components/Logo";
import DeviceInfoPanel from "@/components/DeviceInfoPanel";
import ThresholdPanel from "@/components/ThresholdPanel";
import NotificationPreferencesPanel from "@/components/NotificationPreferencesPanel";
import IntervalPanel from "@/components/IntervalPanel";
import WifiPanel from "@/components/WifiPanel";
import OtaPanel from "@/components/OtaPanel";
import CalibrationPanel from "@/components/CalibrationPanel";
import SerialMonitorPanel from "@/components/SerialMonitorPanel";
import DatabasePanel from "@/components/DatabasePanel";

export default function SettingsPage() {
  return (
    <main className="min-h-screen">
      <section className="px-6 py-10 md:px-12">
        <div className="mx-auto max-w-3xl">
          <div className="glass-card flex flex-wrap items-center justify-between gap-6 px-6 py-6">
            <Logo size={40} />
            <Link
              href="/"
              className="glass-pill px-5 py-2.5 font-body text-xs font-medium text-ink/70 transition-colors hover:text-teal"
            >
              ← Kembali ke Dashboard
            </Link>
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold text-ink">Panel Setting</h1>
          <p className="mt-2 font-body text-sm text-ink/60">
            Threshold, notifikasi, interval, WiFi, OTA, dan kalibrasi. Dilindungi PIN.
          </p>
        </div>
      </section>

      <section className="px-6 py-10 md:px-12">
        <div className="mx-auto max-w-3xl">
          <PinGate>
            {(token) => (
              <div className="flex flex-col gap-8">
                <DeviceInfoPanel token={token} />
                <ThresholdPanel token={token} />
                <NotificationPreferencesPanel token={token} />
                <IntervalPanel token={token} />
                <WifiPanel token={token} />
                <OtaPanel token={token} />
                <CalibrationPanel token={token} />
                <SerialMonitorPanel token={token} />
                <DatabasePanel token={token} />
              </div>
            )}
          </PinGate>
        </div>
      </section>
    </main>
  );
}
