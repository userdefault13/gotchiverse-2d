import css from 'styled-jsx/css';

export default css`
  .paarcel-mint-gallery {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .gallery-title {
    font-family: Pixelar, sans-serif;
    font-size: 4.2rem;
    line-height: 1;
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
    line-height: 1.35;
    color: #fff;
    background: rgba(8, 2, 18, 0.82);
    border: 0.12rem solid rgba(94, 234, 212, 0.35);
    border-radius: 0.45rem;
    padding: 0.7rem 0.9rem;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
  }

  .price-tag {
    color: #5eead4;
    font-weight: 700;
  }

  .price-tag.free {
    color: #7dffc0;
  }

  .price-note {
    color: rgba(230, 255, 250, 0.85);
    font-size: 1.3rem;
  }

  .mint-cta {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    margin-bottom: 0.8rem;
    flex: 0 0 auto;
  }

  .mint-cta :global(.button-container) {
    line-height: 1.15;
  }

  .mint-cta :global(.button-container .inner) {
    padding: 0.45em 0.7em;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    margin-bottom: 0.8rem;
    flex-wrap: wrap;
    background: rgba(8, 2, 18, 0.75);
    border: 0.12rem solid rgba(94, 234, 212, 0.3);
    border-radius: 0.45rem;
    padding: 0.55rem 0.75rem;
    flex: 0 0 auto;
  }

  .toolbar.catalog-tabs {
    padding: 0.35rem;
    gap: 0.35rem;
  }

  .tab-btn {
    appearance: none;
    flex: 1;
    border: none;
    border-radius: 0.4rem;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.25rem;
    text-transform: uppercase;
    padding: 0.55rem 0.7rem;
    cursor: pointer;
  }

  .tab-btn.active {
    background: rgba(20, 120, 110, 0.7);
    color: #fff;
  }

  .count {
    font-size: 1.35rem;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
  }

  .view-toggle {
    display: flex;
    border: 0.15rem solid rgba(94, 234, 212, 0.45);
    border-radius: 0.6rem;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.35);
  }

  .view-btn {
    appearance: none;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.2rem;
    text-transform: uppercase;
    padding: 0.45rem 0.8rem;
    cursor: pointer;
  }

  .view-btn.active {
    background: rgba(20, 120, 110, 0.65);
    color: #fff;
  }

  .section-label {
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.4rem;
    text-transform: uppercase;
    color: #5eead4;
    margin: 0.2rem 0 0.55rem;
    flex: 0 0 auto;
  }

  .parcel-list,
  .install-list {
    overflow: auto;
    min-height: 0;
    flex: 1;
    padding-right: 0.3rem;
    margin-bottom: 0.8rem;
  }

  .parcel-list.list {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.65rem;
    align-content: start;
  }

  .parcel-list.grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: 0.8rem;
    row-gap: 0.8rem;
    align-content: start;
    padding: 0.2rem 0 0.6rem;
  }

  .install-list.list {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .install-list.grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: 0.8rem;
    row-gap: 0.8rem;
    align-content: start;
    padding: 0.2rem 0 0.6rem;
  }

  .install-list {
    flex: 1;
    max-height: none;
  }

  .parcel-card {
    appearance: none;
    position: relative;
    border: 0.15rem solid rgba(94, 234, 212, 0.45);
    background: rgba(8, 24, 40, 0.85);
    border-radius: 0.45rem;
    padding: 0.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    aspect-ratio: 1;
    min-height: 0;
  }

  .parcel-card.list {
    aspect-ratio: 1;
  }

  .install-row {
    appearance: none;
    border: 0.15rem solid rgba(255, 122, 233, 0.45);
    background: rgba(28, 8, 40, 0.88);
    border-radius: 0.45rem;
    color: #fff;
    padding: 0.7rem 0.85rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    cursor: pointer;
    text-align: left;
  }

  .install-tile {
    appearance: none;
    border: 0.15rem solid rgba(255, 122, 233, 0.45);
    background: rgba(28, 8, 40, 0.88);
    border-radius: 0.45rem;
    color: #fff;
    padding: 0.7rem 0.55rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 0.35rem;
    cursor: pointer;
    text-align: center;
    min-height: 11rem;
  }

  .parcel-card:hover,
  .install-row:hover,
  .install-tile:hover,
  .parcel-card.selected {
    border-color: #ffe600;
    box-shadow: 0 0 8px rgba(255, 230, 0, 0.35);
  }

  .parcel-card.in-cart,
  .install-row.in-cart,
  .install-tile.in-cart,
  .parcel-card:disabled,
  .install-row:disabled,
  .install-tile:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .card-check {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    width: 1.1rem;
    height: 1.1rem;
    border-radius: 0.25rem;
    border: 0.15rem solid #7dffc0;
    background: #1a7a4a;
    box-shadow: 0 0 6px rgba(125, 255, 192, 0.7);
  }

  .tile-name {
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.15rem;
    color: #fff;
    word-break: break-word;
  }

  .install-name {
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.35rem;
    color: #fff;
    flex: 1;
  }

  .empty {
    margin: 0;
    font-size: 1.4rem;
    color: rgba(255, 255, 255, 0.7);
    grid-column: 1 / -1;
  }
`;
