import css from 'styled-jsx/css';

export default css`
  .display-img {
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    pointer-events: none;
  }

  .bg-img {
    width: 100%;
    height: 100%;
  }

  .item-img {
    position: absolute;
    inset: 0;
    left: 0;
    top: 0;
    transform: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .display-img.tile .item-img.tile-sprite :global(img),
  .display-img.tile .item-img.tile-sprite :global(span) {
    object-fit: cover !important;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  .sprite-img {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) scale(0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
`;
