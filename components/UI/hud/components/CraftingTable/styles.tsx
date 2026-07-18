import css from 'styled-jsx/css';

export default css`
  .unconnected-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    height: 50.5rem;
  }

  .crafting-table-container {
    position: relative;
  }
  .inner {
    padding: 1.8rem 5.4rem 7.2rem;
  }
  .crafting-table-container.loading .inner {
    opacity: 0.5;
  }

  .table-tab {
    position: absolute;
    top: 0;
  }

  .loading-state {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
  }

  .button-container {
    margin-top: 3.2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 4;
  }

  .crafting-table-container.loading .anvil-container {
    opacity: 0.5;
  }

  .glitter-container {
    position: absolute;
    bottom: 12rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
  }
  .anvil-img {
    position: absolute;
    max-height: 12rem;
    width: 21.4rem;
    bottom: 0.4rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1;
    pointer-events: none;
  }

  .anvil-img :global(img) {
    width: 100% !important;
    height: auto !important;
    object-fit: contain;
  }

  .ready-container {
    position: absolute;
    left: 50%;
    transform: translate(-50%);
    bottom: 11rem;
    width: 19rem;
    z-index: 3;
  }

  .crafting-alchemica-container {
    display: grid;
    grid-template-columns: repeat(4, 25%);
  }

  .alchemica {
    width: 5.5rem;
  }
  .alchemica.ready {
    filter: drop-shadow(0 0 0.8rem var(--col-pink-400));
  }
  .alchemica.not-ready {
    filter: drop-shadow(0 0 0.8rem var(--col-grey));
  }
`;
