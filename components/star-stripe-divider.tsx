/** Logo-derived star + stripes, redrawn as an SVG section divider. */
export function StarStripeDivider({ className }: { className?: string }) {
  return (
    <div
      className={className}
      aria-hidden
      style={{ color: "var(--color-navy)" }}
    >
      <svg
        viewBox="0 0 320 16"
        className="h-4 w-full"
        preserveAspectRatio="none"
        role="presentation"
      >
        {/* left stripes */}
        <g fill="currentColor" opacity="0.5">
          <rect x="0" y="7" width="120" height="2" />
        </g>
        {/* center star (ember) */}
        <path
          fill="var(--color-ember)"
          d="M160 0l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9z"
        />
        {/* right stripes */}
        <g fill="currentColor" opacity="0.5">
          <rect x="200" y="7" width="120" height="2" />
        </g>
      </svg>
    </div>
  );
}
