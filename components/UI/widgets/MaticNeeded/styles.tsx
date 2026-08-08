import css from 'styled-jsx/css';

export default css`
  @keyframes slideDown {
    0% {
      transform: translate(-50%, -100%);
    }
    100% {
      transform: translate(-50%, 0);
    }
  }

  .notification-container {
    display: none;
  }
  .notification-container.visible {
    display: revert;
    position: fixed;
    top: 0;
    left: 50%;
    z-index: 100;
    transform: translate(-50%, 0);
    animation: slideDown 300ms;
  }

  .inner {
    display: flex;
    align-items: center;
    padding: 0 1.2rem 0.8rem;
  }

  .eth-icon {
    display: inline-flex;
    flex-shrink: 0;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    overflow: hidden;
    line-height: 0;
  }

  .eth-icon :global(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  .btc-icon {
    background: rgba(247, 147, 26, 0.15);
  }

  .content {
    margin-left: 2rem;
    min-width: 0;
  }
  .content p {
    font-size: 2.4rem;
    margin: 0;
  }

  .btc-sub {
    font-size: 1.4rem !important;
    margin: 0.4rem 0 0.8rem !important;
    max-width: 36rem;
    line-height: 1.25;
    opacity: 0.9;
  }

`;
