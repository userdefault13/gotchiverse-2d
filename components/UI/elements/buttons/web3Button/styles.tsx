import css from 'styled-jsx/css';

export default css`
  .inner {
    padding: 0.4rem 0.8rem;
    display: flex;
    align-items: center;
    position: relative;
    color: white;
  }

  .jazzicon {
    margin-right: 0.8rem;
    display: flex;
    align-items: center;
  }

  .inner p {
    margin: 0;
    line-height: 1;
  }

  .loading-container {
    display: flex;
    align-items: center;
  }
  .loading-container p {
    margin-left: 0.8rem;
    text-transform: uppercase;
    color: var(--col-grey-200);
  }

  .user-address {
    color: var(--col-grey-000);
  }

  .network {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    margin-top: 0.35rem;
    text-align: left;
    text-transform: capitalize;
  }

  .network-icon {
    display: inline-flex;
    flex-shrink: 0;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50%;
    overflow: hidden;
    line-height: 0;
  }

  .network-icon :global(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  .network.purple {
    color: var(--col-purple-300);
  }
  .network.info {
    color: var(--col-info-border);
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 0.8rem);
    left: 0;
    right: 0;
    z-index: 20;
  }
  .dropdown-item {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9) 75%, rgba(21, 21, 21, 0.9) 75%, rgba(21, 21, 21, 0.9));
    background-size: 100% 0.8rem;
    padding: 1.2rem;
    color: var(--col-white);
    cursor: pointer;
  }
  .dropdown.purple {
    border: 0.3rem solid var(--col-purple-border);
  }
  .dropdown.info {
    border: 0.3rem solid var(--col-info-border);
  }

  .dropdown-item + .dropdown-item {
    border-top: 0.2rem solid rgba(255, 255, 255, 0.12);
  }

  .dropdown-item p {
    text-transform: uppercase;
    font-size: 1.8rem;
  }

  .dropdown-item:hover {
    background-color: #ee93eb;
  }
`;
