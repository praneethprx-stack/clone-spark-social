export function Logo({ size = 36, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 48 48" aria-label="SAC Community logo">
        <defs>
          <linearGradient id="sacg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--primary-glow)" />
            <stop offset="1" stopColor="var(--primary)" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#sacg)" />
        <path
          d="M31 15.5c-1.6-1.5-4-2.5-6.8-2.5-4.3 0-7.2 2.3-7.2 5.5 0 7.5 14 4.3 14 11 0 3.3-3 5.5-7.4 5.5-3 0-5.6-1-7.6-2.8"
          fill="none"
          stroke="var(--primary-foreground)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="35" cy="35" r="3" fill="var(--primary-foreground)" />
      </svg>
      {withText && (
        <span className="font-display text-lg font-bold leading-none tracking-tight">
          SAC<span className="text-primary">.</span>
          <span className="ml-1 hidden font-medium text-muted-foreground lg:inline">Community</span>
        </span>
      )}
    </span>
  );
}
