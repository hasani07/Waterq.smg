"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DevicePublic } from "@/lib/supabase";

// Marker custom (bulatan warna) -- gak pakai icon default Leaflet biar gak ribet
// soal path asset gambar yang sering error di Next.js/webpack.
function createIcon(active: boolean) {
  const color = active ? "#C1793B" : "#14555C";
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export default function DeviceMap({
  devices,
  selectedDeviceId,
  onSelect,
}: {
  devices: DevicePublic[];
  selectedDeviceId: string | null;
  onSelect: (id: string) => void;
}) {
  const validDevices = devices.filter(
    (d) => d.latitude !== null && d.longitude !== null,
  );

  // fallback pusat peta: Semarang, kalau belum ada device dengan koordinat
  const center: [number, number] =
    validDevices.length > 0
      ? [validDevices[0].latitude as number, validDevices[0].longitude as number]
      : [-6.9932, 110.4203];

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "380px", width: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validDevices.map((d) => (
        <Marker
          key={d.id}
          position={[d.latitude as number, d.longitude as number]}
          icon={createIcon(d.id === selectedDeviceId)}
          eventHandlers={{ click: () => onSelect(d.id) }}
        >
          <Popup>
            <span className="font-body text-sm">{d.name}</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
