import css from 'styled-jsx/css';

export default css`
  .icon-container {
    position: relative;
    width: 5.2rem;
    height: 7rem;
    margin: 0 -0.3rem -0.3rem -0.6rem;
  }
  .guide-text {
    padding: 0 0.5rem;
    font-size: 3rem;
    line-height: 0.8;
    font-weight: bold;
  }
  .guide-text.pink {
    color: var(--col-legendary-450);
  }
  .guide-text.info {
    color: var(--col-white);
    padding-bottom: 0.6rem;
    width: 15rem;
  }
`;
