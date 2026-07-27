import css from 'styled-jsx/css';

export default css`
  .paarcel-cart {
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
    color: rgba(200, 255, 245, 0.85);
  }

  .linkish {
    appearance: none;
    border: none;
    background: transparent;
    color: #5eead4;
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.3rem;
    text-transform: uppercase;
    cursor: pointer;
    padding: 0;
  }

  .linkish:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .cart-list {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    margin-bottom: 1rem;
  }

  .cart-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
    border: 0.12rem solid rgba(94, 234, 212, 0.35);
    border-radius: 0.4rem;
    background: rgba(8, 24, 40, 0.8);
    padding: 0.55rem 0.7rem;
  }

  .cart-line.parcel-block {
    flex-direction: column;
    align-items: stretch;
    gap: 0.45rem;
  }

  .cart-line-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
  }

  .nested-equips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    padding-left: 0.2rem;
  }

  .nested-chip {
    display: inline-flex;
    border-radius: 0.25rem;
    overflow: hidden;
    border: 0.1rem solid rgba(255, 122, 233, 0.45);
  }

  .nested-more,
  .nested-empty {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.55);
    align-self: center;
  }

  .nested-empty {
    margin: 0;
    padding-left: 0.2rem;
  }

  .cart-line .line-main {
    flex: 1;
  }

  .cart-line.install {
    border-color: rgba(255, 122, 233, 0.35);
    background: rgba(30, 12, 40, 0.8);
  }

  .line-main {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .line-name {
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.3rem;
  }

  .line-meta {
    font-size: 1.15rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .remove {
    appearance: none;
    border: none;
    background: transparent;
    color: #ff9aef;
    font-size: 2rem;
    line-height: 1;
    cursor: pointer;
    padding: 0 0.2rem;
  }

  .empty {
    margin: 1rem 0;
    font-size: 1.4rem;
    color: rgba(255, 255, 255, 0.65);
  }

  .mint-error {
    margin: 0 0 0.8rem;
    font-size: 1.3rem;
    color: #ff8a8a;
  }

  .cart-footer {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .cart-footer :global(.button-container) {
    line-height: 1.15;
  }

  .cart-footer :global(.button-container .inner) {
    padding: 0.45em 0.7em;
  }

  .total {
    margin: 0;
    font-size: 1.5rem;
  }

  .free {
    color: #7dffc0;
    font-weight: 700;
  }
`;
