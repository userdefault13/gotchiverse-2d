import { type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type MintHoverTipData = {
  top: number;
  left: number;
  width?: number;
  place: 'above' | 'below';
  name: string;
  lines?: string[];
  price?: string;
  priceFree?: boolean;
};

const TIP_WIDTH = 220;
const TIP_GAP = 8;

const tipShellStyle = (tip: MintHoverTipData): CSSProperties => ({
  position: 'fixed',
  top: tip.top,
  left: tip.left,
  width: tip.width ?? TIP_WIDTH,
  zIndex: 2147483000,
  pointerEvents: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.2rem',
  padding: '0.75rem 1rem 0.8rem',
  borderRadius: '0.45rem',
  border: '0.18rem solid rgba(255, 122, 233, 0.75)',
  background: 'rgba(18, 4, 32, 0.96)',
  boxShadow: '0 0 16px rgba(0, 0, 0, 0.55), 0 0 10px rgba(255, 122, 233, 0.35)',
  color: '#fff',
  fontFamily: 'Pixelar, sans-serif',
  textAlign: 'center',
  boxSizing: 'border-box',
  // Grow away from the tile so we only need the anchor edge + a small gap.
  transform: tip.place === 'above' ? 'translateY(-100%)' : 'none',
});

const nameStyle: CSSProperties = {
  display: 'block',
  fontFamily: 'Pixelar, sans-serif',
  fontSize: '2.1rem',
  lineHeight: 1.1,
  background: 'linear-gradient(#ffa24d, #ffe600)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  filter: 'drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.6))',
  marginBottom: '0.1rem',
  textTransform: 'none',
};

const subStyle: CSSProperties = {
  fontSize: '1.3rem',
  lineHeight: 1.25,
  color: 'rgba(255, 255, 255, 0.9)',
  textTransform: 'capitalize',
};

const priceStyle = (free?: boolean): CSSProperties => ({
  fontSize: '1.35rem',
  lineHeight: 1.2,
  color: free ? '#7dffc0' : '#ff9aef',
  marginTop: '0.15rem',
  fontWeight: 700,
});

/** Arrow matching site pink tip border. */
function TipArrow({ place }: { place: 'above' | 'below' }): ReactNode {
  const edge = place === 'above' ? { bottom: '-0.7rem' } : { top: '-0.7rem' };
  const border =
    place === 'above'
      ? { borderTop: '0.7rem solid rgba(255, 122, 233, 0.9)' }
      : { borderBottom: '0.7rem solid rgba(255, 122, 233, 0.9)' };

  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '0.55rem solid transparent',
        borderRight: '0.55rem solid transparent',
        filter: 'drop-shadow(0 0 4px rgba(255, 122, 233, 0.45))',
        ...edge,
        ...border,
      }}
    />
  );
}

/**
 * Hover tip for mint grids. Portals to document.body with fully inline styles
 * so overflow clipping / styled-jsx scope cannot hide it.
 */
export const MintHoverTip = ({ tip }: { tip: MintHoverTipData | null }): JSX.Element | null => {
  // Hover only happens client-side; tip is always null during SSR.
  if (!tip || typeof document === 'undefined') return null;

  return createPortal(
    <div role="tooltip" style={tipShellStyle(tip)}>
      <TipArrow place={tip.place} />
      <span style={nameStyle}>{tip.name}</span>
      {(tip.lines || []).map((line) => (
        <span key={line} style={subStyle}>
          {line}
        </span>
      ))}
      {tip.price ? <span style={priceStyle(tip.priceFree)}>{tip.price}</span> : null}
    </div>,
    document.body,
  );
};

export function mintTipPosition(rect: DOMRect): {
  top: number;
  left: number;
  place: 'above' | 'below';
  width: number;
} {
  // Anchor to the tile edge; tip uses translateY(-100%) when above so gap stays tight.
  let place: 'above' | 'below' = 'above';
  let top = rect.top - TIP_GAP;
  if (top < 48) {
    place = 'below';
    top = rect.bottom + TIP_GAP;
  }

  let left = rect.left + rect.width / 2 - TIP_WIDTH / 2;
  if (rect.right > window.innerWidth * 0.62) {
    left = rect.right - TIP_WIDTH;
  }
  left = Math.min(window.innerWidth - TIP_WIDTH - 12, Math.max(12, left));
  return { top, left, place, width: TIP_WIDTH };
}

/** Title-case parcelHash words for tip / card labels. */
export function formatParcelDisplayName(raw: string | undefined): string {
  const s = String(raw || '').trim();
  if (!s) return 'Parcel';
  // Keep C-* ids as-is when hash missing.
  if (/^C-\d+-\d+-[A-Z]$/i.test(s)) return s;
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
