import css from 'styled-jsx/css';

export default css`
  .paarcel-detail-panel {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .panel-title {
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

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    flex: 0 0 auto;
  }

  .back-btn {
    appearance: none;
    cursor: pointer;
    font-family: Kimberley Rg, sans-serif;
    font-size: 1.45rem;
    line-height: 1;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: #e8fbff;
    background: rgba(0, 40, 90, 0.85);
    border: 2px solid rgba(74, 219, 251, 0.85);
    border-radius: 3px;
    padding: 0.55em 0.9em;
  }

  .back-btn:hover {
    border-color: var(--col-pink-400);
    background: rgba(207, 0, 199, 0.35);
  }

  .scroll-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-right: 0.35rem;
  }

  .section {
    background: rgba(8, 2, 18, 0.82);
    border: 0.12rem solid rgba(94, 234, 212, 0.35);
    border-radius: 0.45rem;
    padding: 0.85rem 1rem;
  }

  .section-title {
    margin: 0 0 0.75rem;
    font-family: Kimberley Rg, sans-serif;
    font-size: 1.7rem;
    line-height: 1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #5eead4;
  }

  .hero {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .hero-meta {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }

  .hero-name {
    margin: 0;
    font-size: 2.2rem;
    line-height: 1.1;
    color: #fff;
    text-transform: capitalize;
    word-break: break-word;
  }

  .hero-line {
    margin: 0;
    font-size: 1.45rem;
    line-height: 1.25;
    color: rgba(230, 255, 250, 0.88);
  }

  .hero-line em {
    font-style: normal;
    color: #5eead4;
    margin-right: 0.35rem;
  }

  .size-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.25rem;
    padding: 0.25rem 0.55rem;
    border-radius: 0.3rem;
    border: 1px solid var(--rarity-border, rgba(94, 234, 212, 0.55));
    background: rgba(0, 0, 0, 0.35);
    color: #fff;
    font-size: 1.35rem;
    text-transform: capitalize;
    width: fit-content;
  }

  .install-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .install-row {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.35rem 0.45rem;
    border-radius: 0.35rem;
    background: rgba(0, 0, 0, 0.28);
    border: 1px solid rgba(94, 234, 212, 0.18);
  }

  .install-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .install-name {
    font-size: 1.45rem;
    color: #fff;
    line-height: 1.15;
  }

  .install-sub {
    font-size: 1.2rem;
    color: rgba(230, 255, 250, 0.7);
  }

  .empty-note {
    margin: 0;
    font-size: 1.4rem;
    color: rgba(230, 255, 250, 0.75);
  }

  .perm-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .perm-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    padding: 0.4rem 0.5rem;
    border-radius: 0.3rem;
    background: rgba(0, 0, 0, 0.28);
    border: 1px solid rgba(94, 234, 212, 0.15);
  }

  .perm-label {
    font-size: 1.4rem;
    color: rgba(230, 255, 250, 0.9);
  }

  .perm-value {
    font-size: 1.35rem;
    color: #5eead4;
    text-align: right;
    white-space: nowrap;
  }

  .breakdown-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.55rem;
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.55rem 0.65rem;
    border-radius: 0.35rem;
    background: rgba(0, 0, 0, 0.32);
    border: 1px solid rgba(94, 234, 212, 0.22);
  }

  .stat-label {
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgba(230, 255, 250, 0.65);
  }

  .stat-value {
    font-size: 2rem;
    line-height: 1.1;
    color: #fff;
    text-transform: capitalize;
  }
`;
