import css from 'styled-jsx/css';

export default css`
  .gotchi-panel {
    position: relative;
    flex: 1 0 auto;
    border-radius: 0.4rem;
    transition: box-shadow 0.1s ease-in-out;
    cursor: url('/cursors/pointer.png'), pointer;
    --border-color: var(--col-gotchi-common-card-border);
    --label-bg-color: var(--col-gotchi-common-card-label-bg);
  }

  .gotchi-panel:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 0.3rem solid var(--border-color);
    border-radius: 0.4rem;
    z-index: -1;
  }

  .gotchi-panel.selected,
  .gotchi-panel:hover {
    box-shadow: 0px 0px 8px var(--col-yellow-100), 0px 0px 8px var(--col-yellow-100);
  }

  .gotchi-img {
    position: relative;
  }

  .gotchi-img-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 11rem;
    background: transparent;
  }

  .gotchi-avatar {
    position: relative;
    width: 9rem;
    height: 9rem;
  }

  .gotchi-name {
    font-family: 'Kimberley Rg';
    font-size: 1.2rem;
    line-height: 1.4;
    background: var(--label-bg-color);
    margin: 0;
    padding: 0.8rem 0.8rem;
    text-align: center;
    color: white;
    border-bottom-left-radius: 0.4rem;
    border-bottom-right-radius: 0.4rem;
    z-index: 20;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
