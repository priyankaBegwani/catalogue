// Shared wordmark component based on whollio_logo_fixed.svg colour palette.
// Uses HTML so it sits flush in the normal box model — no SVG whitespace issues.
//
// variant="dark"  → teal text (#0D5C63) for light/white backgrounds (nav, card)
// variant="light" → cream text (#F0EDE8) for dark backgrounds (login panel)

export type LogoSize = 'sm' | 'md' | 'lg';

const SIZES: Record<LogoSize, { wordmark: string; sub: string; gap: string }> = {
  sm: { wordmark: '1rem',     sub: '0.44rem', gap: '2px' },
  md: { wordmark: '1.875rem', sub: '0.54rem', gap: '4px' },
  lg: { wordmark: '2.6rem',   sub: '0.6rem',  gap: '5px' },
};

export function WholllioLogo({
  variant = 'dark',
  size = 'md',
  showTagline = true,
}: {
  variant?: 'light' | 'dark';
  size?: LogoSize;
  showTagline?: boolean;
}) {
  const mainColor = variant === 'dark' ? '#0D5C63' : '#F0EDE8';
  const subColor  = variant === 'dark' ? '#9CA3AF' : '#7A9DB5';
  const { wordmark, sub, gap } = SIZES[size];

  return (
    <div aria-label="Whollio" role="img">
      <div
        style={{
          fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
          fontWeight: 700,
          fontSize: wordmark,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          color: mainColor,
        }}
      >
        wholl<span style={{ color: '#E8820C' }}>io</span>
      </div>
      {showTagline && (
        <div
          style={{
            fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
            fontWeight: 400,
            fontSize: sub,
            letterSpacing: '0.22em',
            color: subColor,
            marginTop: gap,
            textTransform: 'uppercase',
          }}
        >
          Wholesale · Simplified
        </div>
      )}
    </div>
  );
}
