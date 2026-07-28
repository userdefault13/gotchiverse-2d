import css from 'styled-jsx/css';

export default css`
  .store-inner {
    padding: 2.4rem 3.2rem 3.2rem;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    min-width: min(92vw, 72rem);
  }
  .store-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1.2rem;
    align-items: center;
    font-size: 1.6rem;
    color: #1a1a2e;
  }
  .owner-badge {
    background: #6231ff;
    color: #fff;
    padding: 0.2rem 0.8rem;
    font-size: 1.2rem;
    text-transform: uppercase;
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
    color: #c62828;
  }
  .status {
    margin: 0;
    font-size: 1.4rem;
    color: #6231ff;
  }
  .owner-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
  }
  .store-body {
    display: flex;
    gap: 1.6rem;
    align-items: stretch;
  }
  .store-grid {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    gap: 2px;
    flex: 1;
    aspect-ratio: 1;
    max-height: 56vh;
    background: #2a2a3a;
    padding: 4px;
    image-rendering: pixelated;
  }
  .cell {
    background: #3d3d55;
    min-height: 0;
    border: none;
    padding: 0;
    cursor: pointer;
  }
  .cell.occupied {
    box-shadow: inset 0 0 0 2px #51ffa8;
  }
  .cell.shelf {
    background: #c4a574;
  }
  .cell.shelf-bound {
    background: #e8b84a;
  }
  .cell.cashier {
    background: #4a90e8;
  }
  .cell.console {
    background: #9b59ff;
  }
  .cell.selected {
    outline: 2px solid #fff;
    outline-offset: -2px;
    z-index: 1;
  }
  .cell.placeable:hover {
    background: #6d5cff;
  }
  .cart-panel {
    width: 24rem;
    background: #f4f4f8;
    padding: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 56vh;
    overflow: auto;
  }
  .cart-panel h3 {
    margin: 0;
    font-size: 2rem;
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
    gap: 0.8rem;
    align-items: center;
  }
  .qty {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .cart-total {
    font-weight: 700;
    font-size: 1.6rem;
  }
  .hint {
    margin: 0;
    font-size: 1.4rem;
    color: #555;
  }
  .hint kbd {
    background: #eee;
    padding: 0.1rem 0.4rem;
    border-radius: 2px;
    font-size: 1.2rem;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .shelf-inner {
    padding: 2.4rem 3.2rem 3.2rem;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    min-width: min(90vw, 40rem);
  }
  .shelf-inner label {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 1.4rem;
  }
  .shelf-inner input,
  .shelf-inner textarea {
    font-size: 1.6rem;
    padding: 0.6rem 0.8rem;
    border: 1px solid #ccc;
  }
  .price {
    font-size: 2.4rem;
    font-weight: 700;
    margin: 0;
  }
  .muted {
    color: #777;
    font-size: 1.3rem;
  }
`;
