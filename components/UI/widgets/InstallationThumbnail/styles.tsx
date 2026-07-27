import css from 'styled-jsx/css';

export default css`
  .install-thumb {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.7rem;
    background: linear-gradient(160deg, rgba(255, 122, 233, 0.18), rgba(20, 8, 40, 0.95));
    border: 0.2rem solid rgba(255, 122, 233, 0.5);
    box-shadow: inset 0 0 10px rgba(255, 122, 233, 0.18);
    overflow: hidden;
    image-rendering: pixelated;
  }

  .install-thumb.rarity-tinted {
    border-color: var(--rarity-border, rgba(92, 37, 191, 0.7));
    background: linear-gradient(
      160deg,
      color-mix(in srgb, var(--rarity-glow, #5c25bf) 35%, transparent),
      rgba(12, 4, 28, 0.95)
    );
    box-shadow: inset 0 0 12px color-mix(in srgb, var(--rarity-border, #5c25bf) 45%, transparent);
  }

  .install-thumb :global(img) {
    width: 88% !important;
    height: 88% !important;
    object-fit: contain;
    filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.55));
  }

  .install-thumb.fallback .glyph {
    font-size: 1.8rem;
    line-height: 1;
    color: #e0d0ff;
    text-shadow: 0 0 8px rgba(92, 37, 191, 0.75);
  }
`;
