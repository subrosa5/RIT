/**
 * Fixed decorative backdrop — a skyline of translucent glass towers at
 * dusk, rendered once behind the whole app. Pure CSS/SVG, no interaction,
 * `aria-hidden` and `pointer-events-none` throughout so it never competes
 * with the actual UI or with screen readers. Ambient drift respects
 * prefers-reduced-motion globally (see index.css).
 */
export function GlassBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* base dusk gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 15% 0%, #1c2f66 0%, #0b1530 45%, #060b1c 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 85% 15%, rgba(56,189,248,0.25) 0%, transparent 60%)",
        }}
      />

      {/* tower silhouettes */}
      <svg
        className="absolute inset-x-0 bottom-0 h-full w-full animate-drift-a"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="tower-1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="tower-2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#0b1530" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polygon points="120,900 120,340 210,240 300,340 300,900" fill="url(#tower-1)" />
        <polygon points="340,900 340,220 400,150 460,220 460,900" fill="url(#tower-2)" />
        <polygon points="980,900 980,260 1060,120 1140,260 1140,900" fill="url(#tower-1)" />
        <polygon points="1180,900 1180,380 1240,300 1300,380 1300,900" fill="url(#tower-2)" />
      </svg>

      <svg
        className="absolute inset-x-0 bottom-0 h-full w-full animate-drift-b opacity-80"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="tower-3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0b1530" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <polygon points="560,900 560,460 610,400 660,460 660,900" fill="url(#tower-3)" />
        <polygon points="700,900 700,300 770,190 840,300 840,900" fill="url(#tower-3)" />
        <polygon points="60,900 60,520 100,470 140,520 140,900" fill="url(#tower-3)" />
      </svg>

      {/* window glints */}
      <div className="animate-glint absolute bottom-[120px] left-[18%] h-24 w-16 rounded-sm bg-cyan-300/10 blur-md" />
      <div className="animate-glint absolute bottom-[260px] left-[72%] h-32 w-20 rounded-sm bg-blue-300/10 blur-md [animation-delay:2s]" />
      <div className="animate-glint absolute bottom-[180px] left-[46%] h-20 w-14 rounded-sm bg-indigo-300/10 blur-md [animation-delay:4s]" />

      {/* soft haze at the very bottom so content stays legible */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background: "linear-gradient(to top, rgba(6,11,28,0.55), transparent)",
        }}
      />
    </div>
  );
}
