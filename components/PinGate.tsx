"use client";

import { useState } from "react";
import { usePinSession } from "@/lib/pinSession";

export default function PinGate({
  children,
}: {
  children: (token: string) => React.ReactNode;
}) {
  const { token, submitPin, loading, error } = usePinSession();
  const [pin, setPin] = useState("");

  if (token) return <>{children(token)}</>;

  return (
    <div className="mx-auto mt-16 max-w-sm border border-line bg-white/70 px-8 py-10 text-center">
      <p className="font-display text-lg font-bold text-ink">Masukkan PIN</p>
      <p className="mt-1 font-body text-xs text-ink/50">
        Panel ini dilindungi PIN untuk keamanan.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await submitPin(pin);
          setPin("");
        }}
        className="mt-6 flex flex-col items-center gap-3"
      >
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full border border-line px-4 py-2 text-center font-display text-lg tracking-widest text-ink"
          placeholder="••••••"
          autoFocus
        />
        {error && <p className="font-body text-xs text-alert">{error}</p>}
        <button
          type="submit"
          disabled={loading || pin.length === 0}
          className="w-full bg-teal px-4 py-2 font-body text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Memeriksa..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
