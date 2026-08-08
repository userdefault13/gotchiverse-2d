import css from 'styled-jsx/css';

export default css`
  .gotchi-panel {
    position: relative;
    flex: 1 0 auto;
    border-radius: 0.4rem;
    transition: box-shadow 0.1s ease-in-out;
    cursor: url('/cursors/pointer.png'), pointer;
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

  .gotchi-panel:hover {
    box-shadow: 0px 0px 8px var(--col-yellow-100), 0px 0px 8px var(--col-yellow-100);
  }

  .gotchi-img {
    position: relative;
  }

  .gotchi-img:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--box-inner-bg);
    box-shadow: var(--box-inner-shadow);
    border: 0.3rem solid var(--border-color);
    border-radius: 0.4rem;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom: none;
    z-index: -1;
  }

  .gotchi-img-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 11rem;
    padding: 0.8rem;
  }

  .cartridge-img {
    position: relative;
    width: 7.2rem;
    height: 7.2rem;
  }

  .gotchi-name {
    font-family: Pixelar, sans-serif;
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
  }

  .gotchi-panel.rh {
    --border-color: var(--col-rh-neon);
    --label-bg-color: #3d4f0a;
    --box-inner-bg: rgba(61, 79, 10, 0.55);
    --box-inner-shadow: inset 0px 0px 14px 2px rgba(214, 253, 81, 0.35);
  }

  .gotchi-panel.btc {
    --border-color: var(--col-btc-neon);
    --label-bg-color: #5c3205;
    --box-inner-bg: rgba(92, 50, 5, 0.55);
    --box-inner-shadow: inset 0px 0px 14px 2px rgba(247, 147, 26, 0.4);
  }

  .gotchi-panel.base {
    --border-color: var(--col-info-border);
    --label-bg-color: var(--col-info-600);
    --box-inner-bg: rgba(12, 30, 65, 0.75);
    --box-inner-shadow: inset 0px 0px 14px 2px rgba(74, 219, 251, 0.35);
  }

  .gotchi-panel.selected,
  .gotchi-panel:hover {
    box-shadow: 0px 0px 8px var(--col-yellow-100), 0px 0px 8px var(--col-yellow-100);
  }
`;