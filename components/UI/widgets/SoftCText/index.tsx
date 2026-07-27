import type { ReactNode } from 'react';

/** Soft-launch brand tokens: leading c stays lowercase and smaller. */
const BRAND_RE = /(c)(Aavegotchi|Wearable)(s?)/g;

type Props = {
  children: string;
  className?: string;
};

/**
 * Renders copy with a smaller lowercase "c" in cAavegotchi / cWearable(s).
 * Survives parent `text-transform: uppercase` via `.soft-c { text-transform: none }`.
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
        .soft-c {
          font-size: 0.68em;
          line-height: 1;
          text-transform: none !important;
          vertical-align: 0.16em;
          color: inherit;
          -webkit-text-fill-color: currentColor;
        }
        .soft-brand,
        .soft-rest {
          text-transform: inherit;
        }
        /* Match Pixelar gold gradient titles (parent uses transparent fill). */
        .select-panel-title .soft-c,
        .gallery-title .soft-c,
        .panel-title .soft-c,
        .cart-title .soft-c,
        .tip-title .soft-c,
        .manage-hero-title .soft-c {
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
