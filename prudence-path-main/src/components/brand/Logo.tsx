import { cn } from "@/lib/utils";

const sizeMap = {
  xs: 28,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  "2xl": 80,
} as const;

type LogoSize = keyof typeof sizeMap | number;

type LogoProps = {
  size?: LogoSize;
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
  wordmarkClassName?: string;
};

function resolveSize(size: LogoSize): number {
  return typeof size === "number" ? size : sizeMap[size];
}

/** Inline SVG mark — scales crisply at any size. */
export function LogoMark({ size = "md", className }: { size?: LogoSize; className?: string }) {
  const px = resolveSize(size);
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="prudence-logo-gradient" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5B52EB" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id="prudence-logo-shine" x1="20" y1="12" x2="44" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.35" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#prudence-logo-gradient)" />
      <rect x="2" y="2" width="60" height="30" rx="16" fill="url(#prudence-logo-shine)" />
      {/* P stem + bowl */}
      <path
        d="M22 18h11.5c6.1 0 10.5 4.1 10.5 10s-4.4 10-10.5 10H28v8.5H22V18Z"
        fill="#F8F7FF"
      />
      <path
        d="M28 24.5h5.2c3.2 0 5.3 2 5.3 4.8s-2.1 4.7-5.3 4.7H28V24.5Z"
        fill="url(#prudence-logo-gradient)"
      />
      {/* Accountability check path */}
      <path
        d="M41 42.5 45.5 47 53 38.5"
        stroke="#EEF2FF"
        strokeWidth="3.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  size = "md",
  showWordmark = false,
  showTagline = false,
  className,
  wordmarkClassName,
}: LogoProps) {
  const markSize = showWordmark ? (typeof size === "number" ? size : sizeMap[size]) : size;

  if (!showWordmark) {
    return <LogoMark size={markSize} className={className} />;
  }

  return (
    <div className={cn("flex items-center gap-3 min-w-0", className)}>
      <LogoMark size={markSize} />
      <div className={cn("leading-tight min-w-0", wordmarkClassName)}>
        <span className="block font-bold text-foreground tracking-tight truncate">THE PRUDENCE</span>
        {showTagline && (
          <span className="block text-[11px] text-muted-foreground font-medium truncate">
            Accountability &amp; Training
          </span>
        )}
      </div>
    </div>
  );
}
