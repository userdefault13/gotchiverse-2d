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
    margin: 0 0 1.2rem;
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
    margin-bottom: 1.2rem;
    flex-wrap: wrap;
    background: rgba(8, 2, 18, 0.75);
    border: 0.12rem solid rgba(94, 234, 212, 0.45);
    border-radius: 0.45rem;
    padding: 0.55rem 0.75rem;
    flex: 0 0 auto;
  }

  .toolbar.catalog-tabs {
    padding: 0.35rem;
    gap: 0.35rem;
    border-color: rgba(94, 234, 212, 0.55);
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
    background: rgba(94, 234, 212, 0.35);
    color: #eafffa;
    box-shadow: inset 0 0 0 0.12rem rgba(94, 234, 212, 0.85);
    text-shadow: 0 0 8px rgba(94, 234, 212, 0.55);
  }

  .count {
    font-size: 1.35rem;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
  }

  .view-toggle {
    display: flex;
    border: 0.15rem solid rgba(94, 234, 212, 0.7);
    border-radius: 0.6rem;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.35);
    box-shadow: 0 0 8px rgba(94, 234, 212, 0.25);
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
    background: rgba(94, 234, 212, 0.4);
    color: #eafffa;
    text-shadow: 0 0 8px rgba(94, 234, 212, 0.55);
  }

  .section-label {
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.4rem;
    text-transform: uppercase;
    color: #5eead4;
    margin: 0.2rem 0 0.55rem;
    flex: 0 0 auto;
  }

  .tile-list {
    overflow: auto;
    min-height: 0;
    flex: 1;
    padding-right: 0.3rem;
    margin-bottom: 0.8rem;
  }

  .tile-list.list {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    column-gap: 1.2rem;
    row-gap: 2.8rem;
    align-content: start;
    padding: 0.6rem 0.1rem 1.6rem;
  }

  .tile-list.grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: 1.6rem;
    row-gap: 3.6rem;
    align-content: start;
    padding: 0.8rem 0.2rem 2.4rem;
  }

  .empty {
    margin: 0;
    font-size: 1.4rem;
    color: rgba(255, 255, 255, 0.7);
    grid-column: 1 / -1;
  }
`;
