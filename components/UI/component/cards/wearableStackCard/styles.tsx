import css from 'styled-jsx/css';

export default css`
  .gotchi-panel {
    position: relative;
    flex: 1 0 auto;
    border-radius: 0.4rem;
    transition: box-shadow 0.1s ease-in-out;
    --border-color: #ff7ae9;
    --label-bg-color: #6b1a62;
    --box-inner-bg: rgba(80, 12, 70, 0.75);
    --box-inner-shadow: inset 0px 0px 14px 2px rgba(255, 122, 233, 0.35);
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

  .wearable-glyph {
    position: relative;
    width: 7.2rem;
    height: 7.2rem;
    border-radius: 1rem;
    border: 0.25rem solid rgba(255, 122, 233, 0.7);
    background: linear-gradient(160deg, rgba(255, 122, 233, 0.25), rgba(20, 8, 40, 0.9));
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .wearable-glyph .glyph {
    font-size: 3.2rem;
    line-height: 1;
    color: #ffd6f7;
  }

  .stack-badge {
    position: absolute;
    right: -0.4rem;
    bottom: -0.4rem;
    min-width: 2.4rem;
    padding: 0.2rem 0.45rem;
    border-radius: 0.5rem;
    background: #ff7ae9;
    color: #1a0620;
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.2rem;
    text-align: center;
  }

  .gotchi-name {
    font-family: 'Kimberley Rg';
    font-size: 1.15rem;
    line-height: 1.3;
    background: var(--label-bg-color);
    margin: 0;
    padding: 0.7rem 0.6rem 0.35rem;
    text-align: center;
    color: white;
    z-index: 20;
  }

  .wearable-sub {
    margin: 0;
    padding: 0 0.6rem 0.7rem;
    text-align: center;
    font-size: 1.05rem;
    color: rgba(255, 255, 255, 0.75);
    text-transform: capitalize;
    background: var(--label-bg-color);
    border-bottom-left-radius: 0.4rem;
    border-bottom-right-radius: 0.4rem;
  }
`;
