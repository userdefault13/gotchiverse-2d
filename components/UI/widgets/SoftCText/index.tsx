import type { ReactNode } from 'react';

/** Soft-launch brand tokens: leading c stays lowercase and smaller. */
const BRAND_RE = /(c)(Aavegotchi|Wearable|Paarcel|Installation)(s?)/g;

type Props = {
  children: string;
  className?: string;
};

/**
 * Renders copy with a smaller lowercase "c" in cAavegotchi / cWearable(s) / cPaarcel(s) / cInstallation(s).
 * Survives parent `text-transform: uppercase` via `.soft-c { text-transform: none }`.
 * Keep preceding words (Your / Mint / Manage) outside this component in their own
 * element so parent gradient titles keep clipping correctly on that lead text.
 */
export const SoftCText = ({ children, className }: Props): JSX.Element => {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(BRAND_RE.source, 'g');

  while ((match = re.exec(children)) !== null) {
    if (match.index > last) {
      nodes.push(children.slice(last, match.index));
    }
    nodes.push(
      <span key={`soft-c-${match.index}`} className="soft-brand">
        <span className="soft-c" aria-hidden={false}>
          c
        </span>
        <span className="soft-rest">
          {match[2]}
          {match[3]}
        </span>
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (last < children.length) {
    nodes.push(children.slice(last));
  }

  return (
    <>
      <span className={className || undefined}>{nodes.length > 0 ? nodes : children}</span>
      <style jsx global>{`
        .soft-brand {
          display: inline;
          text-transform: inherit;
        }
        .soft-c {
          display: inline-block;
          font-size: 0.84em;
          line-height: 1;
          vertical-align: baseline;
          text-transform: none !important;
          color: inherit;
          -webkit-text-fill-color: inherit;
        }
        .soft-rest {
          display: inline;
          text-transform: inherit;
          line-height: 1;
          color: inherit;
          -webkit-text-fill-color: inherit;
        }
        /* Nested spans break parent background-clip:text — re-apply gold on both parts. */
        .select-panel-title .soft-c,
        .select-panel-title .soft-rest,
        .gallery-title .soft-c,
        .gallery-title .soft-rest,
        .panel-title .soft-c,
        .panel-title .soft-rest,
        .cart-title .soft-c,
        .cart-title .soft-rest,
        .tip-title .soft-c,
        .tip-title .soft-rest,
        .manage-hero-title .soft-c,
        .manage-hero-title .soft-rest {
          background: -webkit-linear-gradient(#ffa24d, #ffe600);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.6));
        }
      `}</style>
    </>
  );
};
