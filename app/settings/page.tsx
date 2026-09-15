"use client";

import PinGate from "@/components/PinGate";
import DeviceInfoPanel from "@/components/DeviceInfoPanel";
import ThresholdPanel from "@/components/ThresholdPanel";
import EarlyWarningPanel from "@/components/EarlyWarningPanel";
import NotificationPreferencesPanel from "@/components/NotificationPreferencesPanel";
import IntervalPanel from "@/components/IntervalPanel";
import WifiPanel from "@/components/WifiPanel";
import OtaPanel from "@/components/OtaPanel";
import CalibrationPanel from "@/components/CalibrationPanel";
import SerialMonitorPanel from "@/components/SerialMonitorPanel";
import DatabasePanel from "@/components/DatabasePanel";

export default function SettingsPage() {
  return (
    <main>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink">Panel Setting</h1>
        <p className="mt-2 font-body text-sm text-ink/60">
          Threshold, notifikasi, interval, WiFi, OTA, dan kalibrasi. Dilindungi PIN.
        </p>
      </div>

      <PinGate>
        {(token) => (
          <div className="flex flex-col gap-6">
            <DeviceInfoPanel token={token} />
            <ThresholdPanel token={token} />
            <EarlyWarningPanel token={token} />
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
    </main>
  );
}
