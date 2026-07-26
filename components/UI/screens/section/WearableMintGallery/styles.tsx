import css from 'styled-jsx/css';

export default css`
  .wearable-mint-gallery {
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
  }

  .gallery-caption {
    margin: 0 0 1rem;
    font-size: 1.5rem;
    line-height: 1.3;
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

  .mint-cta {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    margin-bottom: 1rem;
  }

  .mint-cta-top {
    margin-top: 0;
  }

  .cost-line {
    margin: 0;
    font-size: 1.35rem;
    color: rgba(255, 255, 255, 0.85);
  }

  .mint-hint {
    margin: 0;
    font-size: 1.3rem;
    line-height: 1.3;
    color: rgba(255, 255, 255, 0.7);
  }

  .mint-error {
    margin: 0;
    font-size: 1.4rem;
    line-height: 1.3;
    color: var(--col-danger-200, #ff6b6b);
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    margin-bottom: 0.8rem;
    flex-wrap: wrap;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .linkish {
    appearance: none;
    border: none;
    background: transparent;
    color: #ff7ae9;
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.4rem;
    text-transform: uppercase;
    cursor: pointer;
    padding: 0;
  }

  .count {
    font-size: 1.3rem;
    color: rgba(255, 255, 255, 0.75);
  }

  .view-toggle {
    display: flex;
    border: 0.15rem solid rgba(255, 255, 255, 0.3);
    border-radius: 0.6rem;
    overflow: hidden;
  }

  .view-btn {
    appearance: none;
    border: none;
    background: rgba(0, 0, 0, 0.35);
    color: rgba(255, 255, 255, 0.75);
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.2rem;
    text-transform: uppercase;
    padding: 0.45rem 0.8rem;
    cursor: pointer;
  }

  .view-btn.active {
    background: rgba(200, 42, 194, 0.55);
    color: #fff;
  }

  .wearable-items {
    flex: 1;
    min-height: 0;
    max-height: calc(100vh - 52rem);
    overflow-y: auto;
    padding-right: 0.4rem;
  }

  .wearable-items.list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .wearable-items.grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
    align-content: start;
  }

  .empty {
    margin: 2rem 0;
    text-align: center;
    color: var(--col-info-200);
    font-size: 1.5rem;
    grid-column: 1 / -1;
  }

  .wearable-row {
    display: grid;
    grid-template-columns: auto auto 1fr auto;
    gap: 1rem;
    align-items: center;
    padding: 0.9rem 1rem;
    border-radius: 0.8rem;
    border: 0.2rem solid rgba(255, 255, 255, 0.25);
    background: rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }

  .wearable-row.checked {
    border-color: #ff7ae9;
    background: rgba(200, 42, 194, 0.25);
  }

  .wearable-row.minted {
    opacity: 0.55;
    cursor: default;
  }

  .wearable-row input {
    width: 1.6rem;
    height: 1.6rem;
  }

  .wearable-card {
    appearance: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: 1rem 0.7rem 0.8rem;
    border-radius: 0.8rem;
    border: 0.2rem solid rgba(255, 255, 255, 0.25);
    background: rgba(0, 0, 0, 0.3);
    color: inherit;
    cursor: pointer;
    text-align: center;
    position: relative;
    min-height: 16rem;
  }

  .wearable-card.checked {
    border-color: #ff7ae9;
    background: rgba(200, 42, 194, 0.25);
  }

  .wearable-card.minted {
    opacity: 0.55;
    cursor: default;
  }

  .check-dot {
    position: absolute;
    top: 0.6rem;
    left: 0.6rem;
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 0.25rem;
    border: 0.15rem solid rgba(255, 255, 255, 0.55);
    background: transparent;
  }

  .check-dot.on {
    background: #ff7ae9;
    border-color: #ff7ae9;
  }

  .wearable-meta {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  .wearable-name {
    font-size: 1.4rem;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .wearable-sub {
    font-size: 1.15rem;
    color: rgba(255, 255, 255, 0.65);
    text-transform: capitalize;
  }

  .wearable-price {
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.3rem;
    color: #ff7ae9;
    white-space: nowrap;
  }

  .wearable-price.free {
    color: #6dffb0;
  }
`;
