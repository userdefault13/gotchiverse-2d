import css from 'styled-jsx/css';

export default css`
  .store-inner {
    padding: 2.4rem 3.2rem 3.2rem;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    min-width: min(92vw, 72rem);
    max-width: min(96vw, 72rem);
    max-height: calc(100vh - 8rem);
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
  .store-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1.2rem;
    align-items: center;
    font-size: 1.6rem;
    color: #1a1a2e;
    flex-shrink: 0;
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
    min-height: 0;
    flex: 1 1 auto;
  }
  .store-grid {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    gap: 1px;
    flex: 1;
    aspect-ratio: 1;
    width: 100%;
    max-height: min(42vh, 36rem);
    background: #1a1410;
    padding: 4px;
    image-rendering: pixelated;
  }
  .cell {
    position: relative;
    min-height: 0;
    border: none;
    padding: 0;
    cursor: pointer;
    overflow: hidden;
    background-color: #3d3d55;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
  .player-sprite {
    position: absolute;
    inset: 8%;
    z-index: 2;
    pointer-events: none;
    background-color: #51ffa8;
    background-size: contain;
    background-position: center bottom;
    background-repeat: no-repeat;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    border-radius: 2px;
  }
  .player-sprite.self {
    background-color: transparent;
  }
  .player-sprite.self:not([style*='background-image']) {
    background-color: #51ffa8;
  }
  .player-sprite.remote {
    inset: 18%;
    opacity: 0.85;
    background-color: #7ec8ff;
  }
  .player-sprite.face-left {
    transform: scaleX(-1);
  }
  .cell.self-here {
    z-index: 2;
  }
  .cell.floor {
    background-color: #3a3a48;
  }
  .cell.wall {
    background-image: url('/images/store/interior/wall-wood.png');
    background-color: #6b4423;
  }
  .cell.door {
    background-image: url('/images/store/interior/door.png');
    background-color: #4a6a8a;
  }
  .cell.window {
    background-image: url('/images/store/interior/window.png');
    background-color: #5a7088;
  }
  .cell.occupied {
    box-shadow: inset 0 0 0 2px #51ffa8;
  }
  .cell.shelf {
    background-image: none;
    background-color: #c4a574;
  }
  .cell.shelf-bound {
    background-image: none;
    background-color: #e8b84a;
  }
  .cell.cashier {
    background-image: none;
    background-color: #4a90e8;
  }
  .cell.console {
    background-image: none;
    background-color: #9b59ff;
  }
  .cell.selected {
    outline: 2px solid #fff;
    outline-offset: -2px;
    z-index: 1;
  }
  .cell.placeable:hover {
    filter: brightness(1.15);
  }
  .store-grid.is-build {
    outline: 2px solid #6231ff;
    outline-offset: 2px;
  }
  .cell.build-mode.floor:hover {
    filter: brightness(1.12);
  }
  .owner-badge.build {
    background: #1a1a2e;
  }
  .floor-tile-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.8rem;
  }
  .floor-tile-label {
    font-size: 1.3rem;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .floor-tile-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    max-height: 7.2rem;
    overflow: auto;
  }
  .floor-tile-chip {
    width: 3.6rem;
    height: 3.6rem;
    border: 2px solid #ccc;
    padding: 0;
    cursor: pointer;
    background-color: #222;
    background-size: cover;
    background-position: center;
    image-rendering: pixelated;
  }
  .floor-tile-chip.active {
    border-color: #6231ff;
    outline: 2px solid #6231ff;
  }
  .cart-panel {
    width: 24rem;
    background: #f4f4f8;
    padding: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: min(42vh, 36rem);
    overflow: auto;
    flex-shrink: 0;
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
    flex-shrink: 0;
    position: sticky;
    bottom: 0;
    padding-top: 0.8rem;
    background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.92) 30%);
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
