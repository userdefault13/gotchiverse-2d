import css from 'styled-jsx/css';

export default css`
  .toast-container {
    background-size: 100% 0.8rem;
    border: 0.2rem solid var(--col-purple-border);
    width: 100%;
  }
  .toast-container.clickable {
    cursor: pointer;
  }
  .toast-container.clickable:hover {
    filter: brightness(1.05);
  }
  .toast-container.success {
    border-color: var(--col-success-400);
  }
  .toast-container.pending {
    border-color: var(--col-info-400);
  }
  .toast-container.error {
    border-color: var(--col-error-400);
  }
  .toast-container.warning {
    border-color: var(--col-warning-400);
  }

  .toast-inner {
    padding: 0.8rem 2.4rem 0.8rem 1.2rem;
    display: flex;
    align-items: center;
    height: 100%;
    background: linear-gradient(to bottom, rgba(131, 72, 255, 0.5), rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0) 70%, rgba(131, 72, 255, 0.5));
  }

  .content-container {
    margin-left: 1.8rem;
  }

  .message,
  .title {
    margin: 0;
    line-height: 1.2;
  }

  .title {
    font-size: 2.4rem;
    text-transform: uppercase;
  }

  .message {
    font-size: 2rem;
    color: var(--col-white);
  }

  .toast-container.success .toast-inner {
    background: linear-gradient(to bottom, rgba(1, 172, 81, 0.5), rgba(1, 172, 81, 0) 30%, rgba(1, 172, 81, 0) 70%, rgba(1, 172, 81, 0.5));
  }
  .toast-container.pending .toast-inner {
    background: linear-gradient(to bottom, rgba(0, 185, 243, 0.5), rgba(0, 185, 243, 0) 30%, rgba(0, 185, 243, 0) 70%, rgba(0, 185, 243, 0.5));
  }
  .toast-container.error .toast-inner {
    background: linear-gradient(to bottom, rgba(221, 44, 38, 0.5), rgba(221, 44, 38, 0) 30%, rgba(221, 44, 38, 0) 70%, rgba(221, 44, 38, 0.5));
  }
  .toast-container.warning .toast-inner {
    background: linear-gradient(to bottom, rgba(215, 221, 38, 0.5), rgba(215, 221, 38, 0) 30%, rgba(215, 221, 38, 0) 70%, rgba(215, 221, 38, 0.5));
  }

  .toast-container.success .title {
    color: var(--col-success-400);
  }
  .toast-container.pending .title {
    color: var(--col-info-400);
  }
  .toast-container.error .title {
    color: var(--col-error-400);
  }
  .toast-container.info .title {
    color: var(--col-purple-400);
  }
  .toast-container.warning .title {
    color: var(--col-warning-400);
  }
`;
