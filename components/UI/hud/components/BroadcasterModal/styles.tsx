import css from 'styled-jsx/css';

export default css`
  .broadcaster-modal {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    min-width: min(92vw, 64rem);
    min-height: 36rem;
    padding: 1.6rem 2rem 2rem;
  }

  .broadcaster-modal.watching {
    min-width: min(96vw, 96rem);
    min-height: min(80vh, 64rem);
  }

  .broadcaster-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.2rem;
  }

  .broadcaster-title {
    font-size: 2rem;
    text-transform: uppercase;
    color: #fff;
  }

  .broadcaster-actions {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex-wrap: wrap;
  }

  .broadcaster-close {
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 0.2rem 0.6rem;
    color: #fff;
    font-size: 1.8rem;
  }

  .broadcaster-meta {
    margin: 0;
    color: rgba(255, 255, 255, 0.75);
    font-size: 1.3rem;
  }

  .broadcaster-config {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .broadcaster-input {
    width: 100%;
    padding: 0.9rem 1.1rem;
    border: 0.15rem solid rgba(79, 195, 247, 0.55);
    background: rgba(16, 2, 33, 0.75);
    color: #fff;
    font-size: 1.4rem;
  }

  .broadcaster-iframe {
    flex: 1;
    width: 100%;
    min-height: 42rem;
    border: 0.2rem solid rgba(79, 195, 247, 0.45);
    background: #000;
  }

  .broadcaster-nosignal {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    min-height: 28rem;
    border: 0.2rem dashed rgba(255, 255, 255, 0.25);
    color: #fff;
    text-align: center;
    padding: 2rem;
  }

  .broadcaster-nosignal p:first-child {
    font-size: 2.4rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0;
  }
`;
