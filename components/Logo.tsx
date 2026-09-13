export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waterq-drop" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2C7A82" />
            <stop offset="100%" stopColor="#14555C" />
          </linearGradient>
        </defs>
        {/* Tetesan air */}
        <path
          d="M24 4C24 4 10 22.5 10 31.5C10 39.5 16.3 45 24 45C31.7 45 38 39.5 38 31.5C38 22.5 24 4 24 4Z"
          fill="url(#waterq-drop)"
        />
        {/* Garis gelombang sensor di dalam tetesan */}
        <path
          d="M13 30C15.5 27 18 33 20.5 30C23 27 25.5 33 28 30C30.5 27 33 33 35 30"
          stroke="#F3F6F4"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
      </svg>
      <div className="leading-tight">
        <p className="font-display text-lg font-bold text-ink">WaterQ</p>
        <p className="-mt-1 font-body text-[10px] uppercase tracking-widest text-teal">
          Semarang
        </p>
      </div>
    </div>
  );
}
