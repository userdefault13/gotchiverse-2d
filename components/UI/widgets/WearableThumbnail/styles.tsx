import css from 'styled-jsx/css';

export default css`
  .wearable-thumb {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.6rem;
    background: rgba(0, 0, 0, 0.35);
    border: 0.15rem solid rgba(255, 122, 233, 0.35);
    overflow: hidden;
    image-rendering: pixelated;
  }

  .wearable-thumb :global(img) {
    width: 85% !important;
    height: 85% !important;
    object-fit: contain;
  }

  .wearable-thumb.fallback .glyph {
    font-size: 1.6rem;
    line-height: 1;
    color: #ffd6f7;
  }
`;
