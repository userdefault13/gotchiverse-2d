import css from 'styled-jsx/css';

export default css`
  .install-gallery {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .gallery-title {
    font-family: Pixelar, sans-serif;
    font-size: 4.2rem;
    line-height: 1;
    text-transform: uppercase;
    background: -webkit-linear-gradient(#ffa24d, #ffe600);
    filter: drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.6));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 0.8rem;
  }

  .gallery-caption {
    margin: 0 0 1.2rem;
    font-size: 1.6rem;
    line-height: 1.2;
    color: var(--col-info-200);
  }

  .gotchi-list-container {
    position: relative;
    flex: 1;
    min-height: 0;
    width: 100%;
  }

  .gotchi-list-inner {
    position: relative;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    gap: 1.2rem;
    max-height: 48rem;
    overflow: auto;
    padding: 0.4rem;
  }

  .empty {
    grid-column: 1 / -1;
    color: var(--col-info-200);
    font-size: 1.6rem;
  }

  .install-card {
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .install-thumb {
    width: 100%;
    aspect-ratio: 1;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    image-rendering: pixelated;
    background-color: #1a1a2e;
  }

  .install-name {
    margin: 0;
    font-size: 1.6rem;
    color: #fff;
  }

  .install-meta,
  .install-source,
  .install-equip {
    margin: 0;
    font-size: 1.3rem;
    color: var(--col-info-200);
  }
`;
