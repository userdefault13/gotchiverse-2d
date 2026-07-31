import css from 'styled-jsx/css';

export default css`
  .console-modal {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    min-width: min(92vw, 72rem);
    min-height: 40rem;
    padding: 1.6rem 2rem 2rem;
  }

  .console-modal.playing {
    min-width: min(96vw, 110rem);
    min-height: min(86vh, 72rem);
    padding: 1rem 1.2rem 1.2rem;
  }

  .console-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.2rem;
  }

  .console-title {
    font-size: 2rem;
    text-transform: uppercase;
    color: #fff;
  }

  .console-actions {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  .console-close {
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 0.2rem;
    display: flex;
  }

  .console-meta {
    margin: 0;
    color: rgba(255, 255, 255, 0.75);
    font-size: 1.3rem;
  }

  .console-meta a {
    color: #7dd3fc;
    text-decoration: underline;
  }

  .console-error {
    margin: 0;
    color: #ff6b9d;
    font-size: 1.3rem;
  }

  .console-game-card:disabled {
    opacity: 0.55;
    cursor: wait;
    transform: none;
  }

  .console-cart-detail {
    font-size: 1.15rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .console-loaded-list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .console-loaded-row {
    padding: 0.8rem 1rem;
    border: 0.15rem solid rgba(123, 97, 255, 0.55);
    background: rgba(16, 2, 33, 0.65);
    color: #fff;
    font-size: 1.4rem;
  }

  .console-upgrade {
    margin-top: 0.8rem;
  }

  .console-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: 1rem;
  }

  .console-game-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.6rem;
    text-align: left;
    padding: 1.2rem;
    border: 0.2rem solid #7b61ff;
    background: rgba(16, 2, 33, 0.9);
    color: #fff;
    cursor: pointer;
    transition: border-color 120ms ease, transform 120ms ease;
  }

  .console-game-card:hover {
    border-color: #ff6b9d;
    transform: translateY(-1px);
  }

  .game-name {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .game-tag {
    font-size: 1.1rem;
    text-transform: uppercase;
    color: #c084fc;
  }

  .game-play {
    margin-top: auto;
    font-size: 1.3rem;
    color: #7dd3fc;
    text-transform: uppercase;
  }

  .console-player {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: min(78vh, 64rem);
    background: #000;
    border: 0.2rem solid #7b61ff;
    overflow: hidden;
  }

  .console-iframe {
    width: 100%;
    flex: 1;
    min-height: min(62vh, 52rem);
    border: 0;
    background: #000;
  }

  .console-embed-fallback {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.2rem;
    border-top: 0.15rem solid rgba(255, 107, 157, 0.55);
    background: rgba(16, 2, 33, 0.95);
  }

  .console-embed-fallback .console-meta {
    flex: 1;
    min-width: 18rem;
  }
`;
