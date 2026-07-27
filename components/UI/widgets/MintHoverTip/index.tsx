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

const tipShellStyle = (tip: MintHoverTipData): CSSProperties => ({
  position: 'fixed',
  top: tip.top,
  left: tip.left,
  width: tip.width ?? 240,
  zIndex: 2147483000,
  pointerEvents: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.15rem',
  padding: '0.75rem 1rem 0.85rem',
  borderRadius: '1.4rem',
  border: '0.28rem solid #3b7ea3',
  background:
    'repeating-linear-gradient(180deg, #d7fbff 0, #d7fbff 0.2rem, #c6f3f8 0.2rem, #c6f3f8 0.4rem)',
  boxShadow: '0.35rem 0.35rem 0 rgba(20, 40, 70, 0.28)',
  color: '#2f3640',
  fontFamily: "Pixelar, 'Courier New', monospace",
  textAlign: 'center',
  boxSizing: 'border-box',
});

const nameStyle: CSSProperties = {
  fontSize: '1.7rem',
  lineHeight: 1.15,
  color: '#2a313a',
};

const subStyle: CSSProperties = {
  fontSize: '1.25rem',
  lineHeight: 1.25,
  color: '#3d4a57',
  textTransform: 'capitalize',
};

const priceStyle = (free?: boolean): CSSProperties => ({
  fontSize: '1.35rem',
  lineHeight: 1.2,
  color: free ? '#1a7a4a' : '#1f6f8c',
  marginTop: '0.1rem',
});

/** Arrow via nested spans so we don't depend on styled-jsx for portaled tips. */
function TipArrow({ place }: { place: 'above' | 'below' }): ReactNode {
  const edge = place === 'above' ? { bottom: '-1.05rem' } : { top: '-1.05rem' };
  const edgeInner = place === 'above' ? { bottom: '-0.7rem' } : { top: '-0.7rem' };
  const outerBorder =
    place === 'above'
      ? { borderTop: '1.05rem solid #3b7ea3' }
      : { borderBottom: '1.05rem solid #3b7ea3' };
  const innerBorder =
    place === 'above'
      ? { borderTop: '0.75rem solid #d7fbff' }
      : { borderBottom: '0.75rem solid #d7fbff' };

  return (
    <>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '0.85rem solid transparent',
          borderRight: '0.85rem solid transparent',
          ...edge,
          ...outerBorder,
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '0.6rem solid transparent',
          borderRight: '0.6rem solid transparent',
          zIndex: 1,
          ...edgeInner,
          ...innerBorder,
        }}
      />
    </>
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

const TIP_WIDTH = 240;
const TIP_EST_HEIGHT = 130;

export function mintTipPosition(rect: DOMRect): {
  top: number;
  left: number;
  place: 'above' | 'below';
  width: number;
} {
  const gap = 14;
  let place: 'above' | 'below' = 'above';
  let top = rect.top - gap - TIP_EST_HEIGHT;
  if (top < 10) {
    place = 'below';
    top = rect.bottom + gap;
  }
  let left = rect.left + rect.width / 2 - TIP_WIDTH / 2;
  if (rect.right > window.innerWidth * 0.62) {
    left = rect.right - TIP_WIDTH;
  }
  left = Math.min(window.innerWidth - TIP_WIDTH - 12, Math.max(12, left));
  return { top, left, place, width: TIP_WIDTH };
}
