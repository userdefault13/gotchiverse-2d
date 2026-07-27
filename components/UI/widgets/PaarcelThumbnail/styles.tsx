import css from 'styled-jsx/css';

export default css`
  .paarcel-thumb {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.55rem;
    background: linear-gradient(160deg, rgba(94, 234, 212, 0.22), rgba(8, 24, 40, 0.95));
    border: 0.18rem solid rgba(94, 234, 212, 0.55);
    box-shadow: inset 0 0 10px rgba(94, 234, 212, 0.18);
    overflow: hidden;
    image-rendering: pixelated;
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
