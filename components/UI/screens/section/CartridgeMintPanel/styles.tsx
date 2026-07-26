import css from 'styled-jsx/css';

export default css`
  .cartridge-mint-panel {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .panel-title {
    font-family: Pixelar, sans-serif;
    font-size: 4.2rem;
    line-height: 1;
    text-transform: uppercase;
    background: -webkit-linear-gradient(#ffa24d, #ffe600);
    filter: drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.6));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 0.8rem;
    white-space: nowrap;
  }

  .panel-caption {
    margin: 0 0 2rem;
    font-size: 1.6rem;
    line-height: 1.35;
    color: var(--col-info-200);
  }

  .detail-rows {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    margin-bottom: 2.4rem;
  }

  .detail-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1.6rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    padding-bottom: 0.8rem;
  }

  .detail-label {
    font-family: 'Kimberley Rg';
    font-size: 1.5rem;
    color: var(--col-info-200);
  }

  .detail-value {
    font-family: 'Kimberley Bl';
    font-size: 1.8rem;
    color: var(--col-white);
    text-align: right;
  }

  .detail-value.free {
    color: var(--col-pink-200);
    text-transform: uppercase;
  }

  .mint-cta {
    margin-top: auto;
  }

  .mint-error {
    margin: 0.8rem 0 0;
    font-size: 1.4rem;
    line-height: 1.3;
    color: var(--col-danger-200, #ff6b6b);
  }
`;
