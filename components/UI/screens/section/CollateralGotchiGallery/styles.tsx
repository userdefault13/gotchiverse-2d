import css from 'styled-jsx/css';

export default css`
  .collateral-gallery {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .gallery-title {
    font-family: 'Kimberley Bl';
    font-size: 3.2rem;
    text-transform: uppercase;
    background: -webkit-linear-gradient(#ffa24d, #ffe600);
    filter: drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.6));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 0.8rem;
    white-space: nowrap;
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
    grid-gap: 2rem;
    align-content: start;
    justify-content: center;
    padding: 0.5rem 0.25rem 3rem;
    width: 100%;
    max-height: calc(100vh - 36rem);
    overflow-y: auto;
  }

  .gotchi-card {
    width: 100%;
    min-height: 13rem;
  }

  .mint-cta {
    margin-top: 1.2rem;
  }

  .mint-error {
    margin: 0.8rem 0 0;
    font-size: 1.4rem;
    line-height: 1.3;
    color: var(--col-danger-200, #ff6b6b);
  }
`;
