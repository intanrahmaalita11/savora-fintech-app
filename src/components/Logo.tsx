export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div className="inline-flex items-center gap-2">
      <div
        className="grid place-items-center rounded-2xl text-primary-foreground shadow-md"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, var(--sage), var(--sage-deep))",
        }}
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
          <path
            d="M5 14c2-6 12-6 14 0M9 19c1.5-2 4.5-2 6 0"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="9" r="2" fill="currentColor" />
        </svg>
      </div>
      <span className="font-display text-xl font-extrabold tracking-tight">Savora</span>
    </div>
  );
}
