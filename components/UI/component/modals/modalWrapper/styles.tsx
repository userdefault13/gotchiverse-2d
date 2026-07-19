import css from 'styled-jsx/css';

export default css`
  .overlay {
    position: fixed;
    /* Above GameNav (10000) and NFT gallery chrome (100000) */
    z-index: 200000;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: space-around;
  }

  .overlay.light {
    background-color: rgba(0, 0, 0, 0.5);
  }

  .panel-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4.5rem;
  }

  .left-panel,
  .right-panel {
    position: absolute;
    flex: 0 1 auto;
    width: 38.5rem;
  }

  .left-panel {
    transform: translateX(calc(-100% - 26rem));
  }

  .right-panel {
    transform: translateX(calc(100% - 26rem));
  }

  .spider-web {
    z-index: 98;
  }
`;
