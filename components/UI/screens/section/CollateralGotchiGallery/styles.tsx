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

  .mint-tabs {
    display: flex;
    gap: 0.6rem;
    margin: 0 0 1rem;
  }

  .mint-tab {
    flex: 1;
    appearance: none;
    border: 0.2rem solid rgba(255, 255, 255, 0.35);
    background: rgba(0, 0, 0, 0.35);
    color: #fff;
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.4rem;
    padding: 0.7rem 0.8rem;
    border-radius: 0.8rem;
    cursor: pointer;
    text-transform: uppercase;
  }

  .mint-tab.active {
    border-color: #ff4de3;
    background: rgba(200, 42, 194, 0.45);
    box-shadow: inset 0 0 0 1px rgba(255, 77, 227, 0.5);
  }

  .gallery-caption {
    margin: 0 0 1.2rem;
    font-size: 1.6rem;
    line-height: 1.2;
    color: var(--col-info-200);
  }

  .price-tag {
    color: #ff7ae9;
    font-weight: 700;
  }

  .price-tag.free {
    color: #6dffb0;
  }

  .price-note {
    color: rgba(255, 255, 255, 0.65);
    font-size: 1.3rem;
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
    max-height: calc(100vh - 42rem);
    overflow-y: auto;
  }

  .gotchi-list-inner.wallet-grid {
    grid-template-columns: 1fr 1fr;
    max-height: calc(100vh - 48rem);
  }

  .gotchi-card {
    position: relative;
    width: 100%;
    min-height: 13rem;
  }

  .gotchi-card.already-minted {
    opacity: 0.55;
  }

  .minted-badge {
    position: absolute;
    top: 0.6rem;
    right: 0.6rem;
    z-index: 2;
    padding: 0.25rem 0.55rem;
    border-radius: 0.4rem;
    background: rgba(0, 0, 0, 0.75);
    border: 1px solid #6dffb0;
    color: #6dffb0;
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.1rem;
    text-transform: uppercase;
    pointer-events: none;
  }

  .empty-wallet {
    grid-column: 1 / -1;
    margin: 2rem 0;
    text-align: center;
    color: var(--col-info-200);
    font-size: 1.5rem;
  }

  .price-tag {
    color: #ff7ae9;
    font-weight: 700;
  }

  .price-tag.free {
    color: #6dffb0;
  }

  .price-note {
    color: rgba(255, 255, 255, 0.65);
    font-size: 1.25rem;
  }

  .wearables-toggle {
    display: flex;
    align-items: flex-start;
    gap: 0.8rem;
    margin: 0 0 0.9rem;
    padding: 0.85rem 1rem;
    border-radius: 0.8rem;
    border: 0.15rem solid rgba(255, 122, 233, 0.45);
    background: rgba(200, 42, 194, 0.18);
    color: #fff;
    font-size: 1.4rem;
    line-height: 1.35;
    cursor: pointer;
  }

  .wearables-toggle input {
    margin-top: 0.25rem;
    width: 1.5rem;
    height: 1.5rem;
    flex: 0 0 auto;
  }

  .gear-preview {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    max-height: 14rem;
    overflow-y: auto;
    margin: 0 0 1rem;
    padding-right: 0.3rem;
  }

  .gear-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.7rem;
    align-items: center;
    padding: 0.55rem 0.7rem;
    border-radius: 0.6rem;
    background: rgba(0, 0, 0, 0.3);
    border: 0.12rem solid rgba(255, 255, 255, 0.2);
  }

  .gear-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .gear-name {
    font-size: 1.3rem;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gear-sub {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.65);
    text-transform: capitalize;
  }

  .gear-price {
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.2rem;
    color: #ff7ae9;
    white-space: nowrap;
  }

  .gear-price.free {
    color: #6dffb0;
  }

  .mint-cta {
    margin-top: 1.2rem;
  }

  .mint-cta-stack {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .mint-cta-top {
    margin: 0 0 1.2rem;
    flex-shrink: 0;
  }

  .mint-hint {
    margin: 0.6rem 0 0;
    font-size: 1.3rem;
    line-height: 1.3;
    color: rgba(255, 255, 255, 0.7);
  }

  .mint-error {
    margin: 0.8rem 0 0;
    font-size: 1.4rem;
    line-height: 1.3;
    color: var(--col-danger-200, #ff6b6b);
  }
`;
