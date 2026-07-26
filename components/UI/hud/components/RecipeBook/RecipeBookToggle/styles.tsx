import css from 'styled-jsx/css';

export default css`
  .toggle-button {
    border: 0.4rem solid var(--col-pink-border);
    background: rgba(0, 0, 0, 0.7);
    color: var(--col-pink-400);
    width: 22rem;
    font-size: 2.6rem;
    height: 6.4rem;
    position: relative;
    text-align: left;
    padding: 0;
    display: flex;
    align-items: center;
    box-shadow: 0 0 0.3rem 0.1rem var(--col-pink-400);
  }
  .halloween.toggle-button {
    border: 0.4rem solid var(--col-halloween-border);
    color: var(--col-halloween-400);
    box-shadow: 0 0 0.3rem 0.1rem var(--col-halloween-400);
  }
  .toggle-button:disabled {
    opacity: 0.4;
  }

  .icon-container {
    background-color: var(--col-pink-600);
    /* border-right: .3rem solid var(--col-pink-border); */
    width: 6.4rem;
    height: 100%;
    position: relative;
    margin-right: 1.6rem;
    background: linear-gradient(to bottom, rgba(200, 42, 194, 0), var(--col-pink-border) 30%, var(--col-pink-border));
    clip-path: polygon(
      0% 0%,
      calc(100%-0.3rem) 0%,
      calc(100%-0.3rem) 0.3rem,
      100% 0.3rem,
      100% calc(100%-0.3rem),
      calc(100%-0.3rem) calc(100%-0.3rem),
      calc(100%-0.3rem) 100%,
      0% 100%
    );
  }
  .halloween .icon-container {
    background-color: var(--col-halloween-600);
    /* border-right: .3rem solid var(--col-halloween-border); */
    background: linear-gradient(to bottom, rgba(200, 42, 194, 0), var(--col-halloween-border) 30%, var(--col-halloween-border));
  }
  .toggle-button span {
    position: absolute;
    left: 50%;
    top: 50%;
    object-fit: contain;
    transform: translate(-50%, -50%) scale(1.15);
    transition: 100ms ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toggle-button:not(:disabled):hover {
    box-shadow: 0 0 0.8rem 0.2rem var(--col-pink-400);
  }
  .halloween.toggle-button:not(:disabled):hover {
    box-shadow: 0 0 0.8rem 0.2rem var(--col-halloween-400);
  }
  .toggle-button:not(:disabled):hover span {
    transform: translate(-50%, -50%) scale(1.3);
  }

  .right-cap {
    border-right: 0.4rem solid var(--col-pink-border);
    border-bottom: 0.4rem solid var(--col-pink-border);
    border-top: 0.4rem solid var(--col-pink-border);
    width: 1.2rem;
    left: 6.4rem;
    height: calc(100% - 2.4rem);
    top: 1.2rem;
    position: absolute;
    background: linear-gradient(to bottom, rgba(200, 42, 194, 0.5), var(--col-pink-border) 15%, var(--col-pink-border));
    box-shadow: 0 0 0.3rem 0.1rem var(--col-pink-400);
  }

  .halloween .right-cap {
    border-right: 0.4rem solid var(--col-halloween-border);
    border-bottom: 0.4rem solid var(--col-halloween-border);
    border-top: 0.4rem solid var(--col-halloween-border);
    background: linear-gradient(to bottom, rgba(200, 42, 194, 0.5), var(--col-halloween-border) 15%, var(--col-halloween-border));
    box-shadow: 0 0 0.3rem 0.1rem var(--col-halloween-400);
  }

  .right-cap:after,
  .right-cap:before {
    content: '';
    position: absolute;
    width: 0.4rem;
    height: 1.2rem;
    background-color: var(--col-pink-border);
  }

  .halloween .right-cap:after,
  .halloween .right-cap:before {
    background-color: var(--col-halloween-border);
  }

  .right-cap:before {
    bottom: calc(100% + 0.4rem);
  }

  .right-cap:after {
    top: calc(100% + 0.4rem);
  }
`;
