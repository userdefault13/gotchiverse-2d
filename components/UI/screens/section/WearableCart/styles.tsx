import css from 'styled-jsx/css';

export default css`
  .wearable-cart {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
    color: #fff;
  }

  .cart-title {
    font-family: Pixelar, sans-serif;
    font-size: 3.6rem;
    line-height: 1;
    text-transform: uppercase;
    background: -webkit-linear-gradient(#ffa24d, #ffe600);
    filter: drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.6));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 0.5rem;
  }

  .cart-caption {
    margin: 0 0 1rem;
    font-size: 1.35rem;
    line-height: 1.3;
    color: var(--col-info-200);
  }

  .price-note {
    color: rgba(255, 255, 255, 0.65);
    font-size: 1.2rem;
  }

  .cart-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.7rem;
  }

  .cart-count {
    font-size: 1.3rem;
    color: rgba(255, 214, 247, 0.85);
  }

  .linkish {
    appearance: none;
    border: none;
    background: transparent;
    color: #ff7ae9;
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.3rem;
    text-transform: uppercase;
    cursor: pointer;
    padding: 0;
  }

  .cart-lines {
    flex: 1;
    min-height: 0;
    max-height: calc(100vh - 48rem);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    padding-right: 0.3rem;
  }

  .empty {
    margin: 2.4rem 0.5rem;
    text-align: center;
    font-size: 1.4rem;
    line-height: 1.4;
    color: var(--col-info-200);
  }

  .cart-line {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    padding: 0.75rem;
    border-radius: 0.4rem;
    border: 0.2rem solid rgba(255, 122, 233, 0.55);
    background: rgba(80, 12, 70, 0.55);
    box-shadow: inset 0 0 12px 2px rgba(255, 122, 233, 0.16);
  }

  .line-main {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.8rem;
    min-width: 0;
  }

  .line-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
    flex: 1 1 auto;
  }

  .line-name {
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.3rem;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .line-sub,
  .line-unit {
    font-size: 1.1rem;
    color: rgba(255, 214, 247, 0.8);
    text-transform: capitalize;
  }

  .line-unit.free {
    color: #6dffb0;
    text-transform: none;
  }

  .line-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .qty {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    border: 0.15rem solid rgba(255, 122, 233, 0.55);
    border-radius: 0.5rem;
    background: rgba(0, 0, 0, 0.35);
    padding: 0.15rem;
  }

  .qty-btn {
    appearance: none;
    border: none;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 0.35rem;
    background: rgba(200, 42, 194, 0.45);
    color: #fff;
    font-size: 1.6rem;
    line-height: 1;
    cursor: pointer;
  }

  .qty-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .qty-value {
    min-width: 2rem;
    text-align: center;
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.4rem;
  }

  .line-total {
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.35rem;
    color: #ff7ae9;
    margin-left: auto;
  }

  .line-total.free {
    color: #6dffb0;
  }

  .trash-btn {
    appearance: none;
    border: 0.15rem solid rgba(255, 122, 233, 0.45);
    background: rgba(0, 0, 0, 0.35);
    border-radius: 0.45rem;
    width: 2.8rem;
    height: 2.8rem;
    cursor: pointer;
    color: #ff9ad8;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .trash-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .cart-footer {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    flex-shrink: 0;
  }

  .totals {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 0.7rem 0.2rem;
    border-top: 0.15rem solid rgba(255, 122, 233, 0.4);
  }

  .totals-label {
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.5rem;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.85);
  }

  .totals-value {
    font-family: Pixelar, sans-serif;
    font-size: 2.6rem;
    color: #ff7ae9;
  }

  .totals-value.free {
    color: #6dffb0;
  }

  .mint-error {
    margin: 0;
    font-size: 1.35rem;
    line-height: 1.3;
    color: var(--col-danger-200, #ff6b6b);
  }
`;
