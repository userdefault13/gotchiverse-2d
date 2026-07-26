import css from 'styled-jsx/css';

export default css`
  .wearable-import-panel {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .panel-title {
    font-family: 'Kimberley Bl';
    font-size: 3.2rem;
    text-transform: uppercase;
    background: -webkit-linear-gradient(#ffa24d, #ffe600);
    filter: drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.6));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 0.8rem;
  }

  .panel-caption {
    margin: 0 0 1rem;
    font-size: 1.5rem;
    line-height: 1.3;
    color: var(--col-info-200);
  }

  .price-tag.free {
    color: #6dffb0;
    font-weight: 700;
  }

  .price-note {
    color: rgba(255, 255, 255, 0.65);
    font-size: 1.3rem;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.8rem;
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

  .wearable-list {
    flex: 1;
    min-height: 0;
    max-height: calc(100vh - 44rem);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding-right: 0.4rem;
  }

  .empty {
    margin: 2rem 0;
    text-align: center;
    color: var(--col-info-200);
    font-size: 1.5rem;
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

  .wearable-row input {
    width: 1.6rem;
    height: 1.6rem;
  }

  .wearable-meta {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  .wearable-name {
    font-size: 1.5rem;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .wearable-sub {
    font-size: 1.2rem;
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

  .mint-cta {
    margin-top: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  .skip-btn {
    appearance: none;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.75);
    font-size: 1.4rem;
    text-decoration: underline;
    cursor: pointer;
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
`;
