import css from 'styled-jsx/css';

export default css`
  .paarcel-thumb {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.7rem;
    background: linear-gradient(160deg, rgba(94, 234, 212, 0.22), rgba(8, 24, 40, 0.95));
    border: 0.2rem solid rgba(94, 234, 212, 0.55);
    box-shadow: inset 0 0 10px rgba(94, 234, 212, 0.18);
    overflow: hidden;
    image-rendering: pixelated;
  }

  .paarcel-thumb.size-tinted {
    border-color: var(--rarity-border, rgba(94, 234, 212, 0.55));
    background: linear-gradient(
      160deg,
      color-mix(in srgb, var(--rarity-glow, #3b9eff) 35%, transparent),
      rgba(8, 16, 40, 0.95)
    );
    box-shadow: inset 0 0 12px color-mix(in srgb, var(--rarity-border, #3b9eff) 45%, transparent);
  }

  .paarcel-thumb :global(img) {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover;
  }

  .paarcel-thumb.fallback .glyph {
    font-size: 1.8rem;
    line-height: 1;
    color: #c8fff5;
    text-shadow: 0 0 8px rgba(94, 234, 212, 0.75);
  }
`;
