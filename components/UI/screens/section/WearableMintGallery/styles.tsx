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
    border: 0.15rem solid rgba(255, 122, 233, 0.45);
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
    gap: 0.7rem;
  }

  .wearable-items.grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.8rem;
    align-content: start;
    /* Room so in-card tips aren't clipped by scroll edges. */
    padding: 0.2rem 0.2rem 1.2rem;
    overflow-x: hidden;
  }

  .empty {
    margin: 2rem 0;
    text-align: center;
    color: var(--col-info-200);
    font-size: 1.5rem;
    grid-column: 1 / -1;
  }

  .wearable-row {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    align-items: center;
    padding: 0.9rem 1rem;
    border-radius: 0.4rem;
    border: 0.25rem solid rgba(255, 122, 233, 0.55);
    background: rgba(80, 12, 70, 0.55);
    box-shadow: inset 0 0 14px 2px rgba(255, 122, 233, 0.18);
    cursor: pointer;
    color: #fff;
    width: 100%;
    text-align: left;
  }

  .wearable-row.checked {
    border-color: #ff7ae9;
    background: rgba(200, 42, 194, 0.35);
    box-shadow: 0 0 8px rgba(255, 230, 0, 0.35), inset 0 0 14px 2px rgba(255, 122, 233, 0.28);
  }

  .wearable-row.minted {
    opacity: 0.55;
    cursor: default;
  }

  .wearable-row input {
    width: 1.6rem;
    height: 1.6rem;
    accent-color: #ff7ae9;
  }

  .wearable-card {
    appearance: none;
    -webkit-appearance: none;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 0;
    margin: 0;
    border: 0.25rem solid #ff7ae9;
    border-radius: 0.4rem;
    background: rgba(80, 12, 70, 0.75);
    box-shadow: inset 0 0 14px 2px rgba(255, 122, 233, 0.28);
    color: #fff;
    cursor: pointer;
    text-align: left;
    position: relative;
    min-height: 0;
    font: inherit;
    transition: box-shadow 0.1s ease-in-out, border-color 0.1s ease-in-out;
    overflow: hidden;
  }

  .wearable-card.icon-only {
    aspect-ratio: 1;
    width: 100%;
  }

  .wearable-card:hover,
  .wearable-card.checked {
    box-shadow: 0 0 8px var(--col-yellow-100, #ffe600), 0 0 8px var(--col-yellow-100, #ffe600),
      inset 0 0 14px 2px rgba(255, 122, 233, 0.35);
    z-index: 3;
  }

  .wearable-card.checked {
    border-color: #ffd6f7;
    background: rgba(120, 24, 110, 0.85);
  }

  .wearable-card.minted {
    opacity: 0.55;
    cursor: default;
  }

  .wearable-card:disabled {
    cursor: default;
  }

  .check-dot {
    position: absolute;
    top: 0.4rem;
    left: 0.4rem;
    z-index: 4;
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 0.3rem;
    border: 0.18rem solid rgba(255, 214, 247, 0.75);
    background: rgba(0, 0, 0, 0.45);
  }

  .check-dot.on {
    background: #ff7ae9;
    border-color: #ffd6f7;
    box-shadow: 0 0 6px rgba(255, 122, 233, 0.8);
  }

  .card-art {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 0;
    padding: 0.9rem;
    background: linear-gradient(160deg, rgba(255, 122, 233, 0.18), rgba(20, 8, 40, 0.9));
  }

  /* Hover tip stays inside the tile — never spills into the right-rail cart. */
  .card-tip {
    position: absolute;
    inset: 0;
    z-index: 3;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 0.15rem;
    padding: 0.55rem 0.5rem 0.55rem;
    background: linear-gradient(180deg, rgba(12, 2, 22, 0.15) 0%, rgba(12, 2, 22, 0.92) 55%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s ease-in-out;
  }

  .wearable-card:hover .card-tip,
  .wearable-card:focus-visible .card-tip {
    opacity: 1;
  }

  .card-tip .wearable-name {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 1.15rem;
    line-height: 1.15;
  }

  .card-tip .wearable-sub {
    font-size: 1rem;
    line-height: 1.25;
    white-space: normal;
  }

  .card-tip .wearable-price {
    font-size: 1.2rem;
  }

  .wearable-meta {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
    flex: 1 1 auto;
    text-align: left;
  }

  .wearable-name {
    display: block;
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.25rem;
    line-height: 1.25;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .wearable-sub {
    display: block;
    font-size: 1.1rem;
    line-height: 1.3;
    color: rgba(255, 214, 247, 0.8);
    text-transform: capitalize;
  }

  .wearable-price {
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.25rem;
    color: #ff7ae9;
    white-space: nowrap;
    text-transform: none;
  }

  .wearable-price.free {
    color: #6dffb0;
  }

  .wearable-row .wearable-price {
    font-size: 1.35rem;
  }
`;
