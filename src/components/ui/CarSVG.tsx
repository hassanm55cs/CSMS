export function CarSVG({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 220 80" className={className} style={style} aria-hidden="true">
      {/* Road shadow */}
      <ellipse cx="110" cy="77" rx="92" ry="5" fill="rgba(0,0,0,0.12)" />
      {/* Body */}
      <rect x="18" y="30" width="184" height="34" rx="9" fill="#2563EB" />
      {/* Cabin */}
      <path d="M58 30 L76 11 L150 11 L170 30 Z" fill="#1D4ED8" />
      {/* Windshield */}
      <path d="M81 28 L94 13 L149 13 L163 28 Z" fill="rgba(186,230,253,0.55)" />
      {/* Rear window */}
      <path d="M61 28 L77 12 L92 12 L80 28 Z" fill="rgba(186,230,253,0.35)" />
      {/* Side windows */}
      <rect x="97" y="14" width="19" height="13" rx="2.5" fill="rgba(186,230,253,0.3)" />
      <rect x="120" y="14" width="19" height="13" rx="2.5" fill="rgba(186,230,253,0.3)" />
      {/* Door line */}
      <line x1="110" y1="32" x2="110" y2="63" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      {/* Door handles */}
      <rect x="90" y="46" width="11" height="3" rx="1.5" fill="rgba(255,255,255,0.5)" />
      <rect x="118" y="46" width="11" height="3" rx="1.5" fill="rgba(255,255,255,0.5)" />
      {/* Front bumper */}
      <rect x="196" y="42" width="13" height="18" rx="5" fill="#1E40AF" />
      {/* Headlight */}
      <ellipse cx="203" cy="47" rx="6" ry="4.5" fill="#FEF08A" opacity="0.95" />
      <ellipse cx="203" cy="47" rx="3" ry="2.2" fill="#FEFCE8" />
      {/* Rear bumper */}
      <rect x="11" y="42" width="10" height="18" rx="5" fill="#1E3A8A" />
      {/* Tail light */}
      <ellipse cx="16" cy="47" rx="5" ry="3.5" fill="#EF4444" opacity="0.9" />
      {/* Front wheel */}
      <g className="wheel-spin"><circle cx="168" cy="64" r="14" fill="#0F172A" /><circle cx="168" cy="64" r="8.5" fill="#1E293B" /><circle cx="168" cy="64" r="4.5" fill="#334155" /><circle cx="165" cy="61" r="1.5" fill="rgba(255,255,255,0.25)" /></g>
      {/* Rear wheel */}
      <g className="wheel-spin"><circle cx="58" cy="64" r="14" fill="#0F172A" /><circle cx="58" cy="64" r="8.5" fill="#1E293B" /><circle cx="58" cy="64" r="4.5" fill="#334155" /><circle cx="55" cy="61" r="1.5" fill="rgba(255,255,255,0.25)" /></g>
    </svg>
  );
}
