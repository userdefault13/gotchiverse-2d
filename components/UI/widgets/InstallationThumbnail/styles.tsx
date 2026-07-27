import css from 'styled-jsx/css';

export default css`
  .install-thumb {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.55rem;
    background: linear-gradient(160deg, rgba(255, 122, 233, 0.18), rgba(20, 8, 40, 0.95));
    border: 0.18rem solid rgba(255, 122, 233, 0.5);
    box-shadow: inset 0 0 10px rgba(255, 122, 233, 0.18);
    overflow: hidden;
    image-rendering: pixelated;
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
    color: #ffd6f7;
    text-shadow: 0 0 8px rgba(255, 122, 233, 0.75);
  }
`;
