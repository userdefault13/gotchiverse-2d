import css from 'styled-jsx/css';

export default css`
  .wallet-toggle-container {
    border: none;
    padding: 0;
    background: none;
    height: 100%;
    margin: 0 1rem;
  }
  .inner {
    display: flex;
    align-items: center;
    padding: 1rem 1.2rem 0.5rem 0.6rem;
  }

  .jazzicon {
    border: 2px solid var(--col-purple-300);
    border-radius: 50%;
    overflow: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .user-details {
    margin-left: 1.2rem;
  }

  .user-details p {
    margin: 0;
    line-height: 1;
    text-align: left;
  }

  .user-details .address {
    font-size: 2rem;
    line-height: 0.8;
  }
  .user-details .network {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    margin-top: 0.35rem;
    color: var(--col-purple-300);
    font-size: 2rem;
    text-transform: capitalize;
  }

  .user-details .network-icon {
    display: inline-flex;
    flex-shrink: 0;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50%;
    overflow: hidden;
    line-height: 0;
  }

  .user-details .network-icon :global(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  .user-details .switch-network {
    display: block;
    margin: 0.35rem 0 0;
    padding: 0;
    border: none;
    background: none;
    color: var(--col-info-200);
    font: inherit;
    font-size: 1.5rem;
    line-height: 1;
    text-align: left;
    text-decoration: underline;
    text-underline-offset: 0.15em;
    cursor: pointer;
  }

  .user-details .switch-network:hover {
    color: #fff;
  }
`;
