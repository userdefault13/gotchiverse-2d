import css from 'styled-jsx/css';

export default css`
  .store-hud {
    position: fixed;
    inset: 5rem 0 0 0;
    z-index: 40;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1.2rem 1.6rem 1.6rem;
  }
  .store-hud.build-active {
    z-index: 47;
    justify-content: flex-start;
  }
  .hud-panel {
    pointer-events: auto;
  }
  .store-hud-top,
  .store-hud-build,
  .store-hud-bottom {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    align-items: center;
    background: rgba(21, 6, 40, 0.88);
    border: 2px solid #6231ff;
    padding: 0.8rem 1.2rem;
    color: #f5f0ff;
    font-size: 1.4rem;
  }
  .store-hud-top.minimal {
    align-self: flex-start;
    max-width: min(96vw, 48rem);
  }
  .store-hud-build {
    margin-top: 0.8rem;
    max-width: min(96vw, 72rem);
  }
  .owner-badge {
    background: #6231ff;
    color: #fff;
    padding: 0.2rem 0.8rem;
    font-size: 1.2rem;
    text-transform: uppercase;
  }
  .owner-badge.build {
    background: var(--col-success-300);
    color: #042012;
  }
  .build-status {
    font-size: 1.2rem;
    color: var(--col-success-300);
    max-width: 36rem;
  }
  .cart-chip {
    margin-left: auto;
    cursor: pointer;
    background: #1a1a2e;
    color: #fff;
    padding: 0.4rem 1rem;
    font-size: 1.4rem;
  }
  .err {
    color: #ff8a80;
  }
  .status {
    margin: 0.8rem 0 0;
    align-self: flex-start;
    font-size: 1.4rem;
    color: #cbb8ff;
    background: rgba(21, 6, 40, 0.88);
    border: 1px solid #6231ff;
    padding: 0.6rem 1rem;
  }
  .hint {
    margin: 0;
    flex: 1;
    font-size: 1.3rem;
    color: #d8cff5;
  }
  .actions {
    display: flex;
    gap: 0.8rem;
  }
  .muted {
    color: #9a8fb8;
    font-size: 1.2rem;
  }
  .floor-tile-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    width: 100%;
  }
  .floor-tile-label {
    font-size: 1.2rem;
    color: #cbb8ff;
  }
  .floor-tile-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .floor-tile-chip {
    width: 3.2rem;
    height: 3.2rem;
    border: 2px solid transparent;
    background-size: cover;
    background-position: center;
    image-rendering: pixelated;
    cursor: pointer;
  }
  .floor-tile-chip.active {
    border-color: #00b9e1;
  }
  .cart-panel {
    position: absolute;
    right: 1.6rem;
    bottom: 7rem;
    width: min(32rem, 90vw);
    background: rgba(21, 6, 40, 0.95);
    border: 2px solid #6231ff;
    padding: 1.2rem;
    color: #f5f0ff;
  }
  .cart-panel h3 {
    margin: 0 0 0.8rem;
  }
  .cart-panel ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  .cart-panel li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
  }
  .qty {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .total {
    font-weight: 700;
    margin: 1rem 0;
  }
  .shelf-modal {
    padding: 1.6rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: min(90vw, 36rem);
  }
  .product-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  .product-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.8rem;
    border: 1px solid #ddd;
    cursor: pointer;
  }
  .product-list li.active {
    border-color: #00bfa5;
    background: rgba(0, 191, 165, 0.08);
  }
  .slot-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .slot-chip {
    border: 1px solid #bbb;
    background: #f7f7f7;
    padding: 0.4rem 0.7rem;
    font-size: 1.2rem;
    cursor: pointer;
  }
  .slot-chip.active {
    border-color: #00bfa5;
    background: #e6fff8;
  }
  .rack-config {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-bottom: 0.6rem;
  }
  .bind-form {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    border-top: 1px solid #ddd;
    padding-top: 1rem;
  }
  .bind-form label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 1.3rem;
  }
  .bind-form input {
    padding: 0.6rem;
    font-size: 1.4rem;
  }
  .bind-actions {
    display: flex;
    gap: 0.8rem;
    flex-wrap: wrap;
  }
`;
