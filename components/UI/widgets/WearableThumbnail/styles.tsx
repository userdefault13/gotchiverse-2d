import css from 'styled-jsx/css';

export default css`
  .wearable-thumb {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.7rem;
    background: linear-gradient(160deg, rgba(255, 122, 233, 0.2), rgba(12, 4, 28, 0.95));
    border: 0.2rem solid rgba(255, 122, 233, 0.55);
    box-shadow: inset 0 0 10px rgba(255, 122, 233, 0.2);
    overflow: hidden;
    image-rendering: pixelated;
  }

  .wearable-thumb :global(img) {
    width: 88% !important;
    height: 88% !important;
    object-fit: contain;
    filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.55));
  }

  .wearable-thumb.fallback .glyph {
    font-size: 1.8rem;
    line-height: 1;
    color: #ffd6f7;
    text-shadow: 0 0 8px rgba(255, 122, 233, 0.75);
  }
`;
