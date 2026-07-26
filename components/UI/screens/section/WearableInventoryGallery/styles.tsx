import css from 'styled-jsx/css';

export default css`
  .wearable-gallery {
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
    grid-template-columns: 1fr 1fr;
    grid-gap: 1.4rem;
    align-content: start;
    padding: 0.5rem 0.25rem 3rem;
    width: 100%;
    max-height: calc(100vh - 36rem);
    overflow-y: auto;
  }

  .empty {
    grid-column: 1 / -1;
    margin: 2rem 0;
    text-align: center;
    color: var(--col-info-200);
    font-size: 1.5rem;
  }

  .wearable-card {
    border-radius: 0.8rem;
    border: 0.2rem solid rgba(255, 122, 233, 0.55);
    background: rgba(0, 0, 0, 0.35);
    padding: 1rem;
    min-height: 11rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .wearable-name {
    margin: 0;
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.5rem;
    color: #fff;
  }

  .wearable-meta,
  .wearable-source,
  .wearable-equip {
    margin: 0;
    font-size: 1.2rem;
    line-height: 1.3;
    color: rgba(255, 255, 255, 0.7);
    text-transform: capitalize;
  }

  .wearable-equip {
    text-transform: none;
    color: #ffd6f7;
    margin-top: auto;
  }
`;
