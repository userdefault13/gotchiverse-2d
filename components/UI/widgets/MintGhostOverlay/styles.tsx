import css from 'styled-jsx/css';

export default css`
  .mint-ghost-overlay {
    position: fixed;
    inset: 0;
    z-index: 1400;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.2rem;
    background: rgba(0, 0, 0, 0.62);
    pointer-events: all;
  }

  .mint-ghost-gif {
    width: 8.8rem;
    height: 8.8rem;
    image-rendering: pixelated;
  }

  .mint-ghost-label {
    margin: 0;
    color: #fff;
    font-size: 1.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    text-align: center;
    max-width: min(90vw, 36rem);
  }

  .mint-ghost-bar {
    width: min(72vw, 28rem);
    height: 1.4rem;
    border: 0.2rem solid var(--col-purple-border, #7b61ff);
    background: rgba(16, 2, 33, 0.85);
    overflow: hidden;
    border-radius: 0.2rem;
  }

  .mint-ghost-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff6b9d 0%, #c084fc 55%, #7dd3fc 100%);
    transition: width 220ms ease-out;
  }

  .mint-ghost-pct {
    margin: 0;
    color: rgba(255, 255, 255, 0.85);
    font-size: 1.4rem;
    letter-spacing: 0.03em;
  }
`;
