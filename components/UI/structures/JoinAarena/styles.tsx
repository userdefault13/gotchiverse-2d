import css from 'styled-jsx/css';

export default css`
  .join-aarena {
    display: flex;
    flex-direction: column;
    width: 100%;
    position: relative;
  }

  @media screen and (max-width: 1400px) {
    .title {
      font-size: 5rem;
      line-height: 1.2;
    }
  }
  .out-container {
    margin-top: 4rem;
    width: 100%;
    aspect-ratio: 2/1;
    border: 0.6rem solid var(--col-yellow-border);
    border-bottom: none;
    position: relative;
    cursor: url('/cursors/pointer.png'), pointer;
    filter: drop-shadow(0px -3px 6px var(--col-yellow-100));
  }
  .inside-title-container {
    background: var(--col-yellow-100);
    position: absolute;
    top: -3rem;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0px -3px 20px rgba(0, 0, 0, 0.8);
    clip-path: polygon(
      0% 1rem,
      1rem 1rem,
      1rem 0,
      calc(100% - 1rem) 0%,
      calc(100% - 1rem) 1rem,
      100% 1rem,
      100% calc(100% - 1rem),
      calc(100% - 1rem) calc(100% - 1rem),
      calc(100% - 1rem) 100%,
      1rem 100%,
      1rem calc(100% - 1rem),
      0% calc(100% - 1rem)
    );
    z-index: 1;
    width: max-content;
  }
  .inside-title-container .inner {
    position: relative;
    padding: 1.5rem 3.5rem;
    margin: 0.5rem;
    width: calc(100% - 1rem);
    height: calc(100% - 1rem);
    background: linear-gradient(to left, var(--col-blue-400) 12.8%, var(--col-success-200) 100%), var(--col-info-900);
    clip-path: polygon(
      0% 1rem,
      1rem 1rem,
      1rem 0,
      calc(100% - 1rem) 0%,
      calc(100% - 1rem) 1rem,
      100% 1rem,
      100% calc(100% - 1rem),
      calc(100% - 1rem) calc(100% - 1rem),
      calc(100% - 1rem) 100%,
      1rem 100%,
      1rem calc(100% - 1rem),
      0% calc(100% - 1rem)
    );
  }
  .image-wrapper {
    position: relative;
    width: calc(100% - 1rem);
    aspect-ratio: 2/1;
    border: 0.5rem solid var(--col-yellow-border);
    margin: 0.5rem;
  }
  .content {
    font-family: Pixelar;
    font-size: 3rem;
    line-height: 1;
    color: var(--col-white);
    padding: 0.3em;
  }

  .hexagon {
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  }
  .player-info-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    background: linear-gradient(180deg, rgba(255, 214, 0, 0.5) -18.54%, rgba(213, 166, 0, 0.21) 52.46%, rgba(88, 42, 0, 0.025) 100%),
      linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0) 100%);
    height: 7rem;
    margin-top: 0.5rem;
  }
  .player-info-container .text {
    font-size: 3rem;
    line-height: 1.1;
    width: 50%;
    text-transform: uppercase;
    color: var(--col-yellow-100);
    font-family: Pixelar;
    text-align: right;
    margin-top: -10px;
  }
  .player-info-container .text.right {
    text-align: left;
  }

  .hexagon-container {
    position: relative;
    min-width: 16rem;
    height: 14rem;
    background: var(--col-yellow-100);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .hexagon-outline {
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 16.3rem;
    height: 14.3rem;
    position: relative;
    margin-top: -6rem;
  }
  .hexagon-outline::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--col-yellow-200);
    filter: blur(5px);
    z-index: -1;
  }

  .hexagon-border {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 90%;
    height: 90%;
    background: var(--col-yellow-100);
  }

  .hexagon-border.secondary {
    width: 95%;
    height: 95%;
    background: rgba(22, 13, 74, 0.9);
  }
  .secondary.large {
    width: 95%;
    height: 95%;
  }

  .player-count {
    background: rgba(0, 0, 0, 0.8);
    border: 4px solid var(--col-yellow-border);
    border-radius: 3px;
    color: var(--col-yellow-100);
    font-family: Pixelar;
    font-size: 2rem;
    line-height: 1;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 2rem;
    padding: 1rem 2rem;
  }
  .bottom-outline {
    display: flex;
    width: 100%;
    height: 2.4rem;
    filter: drop-shadow(0px 2px 2px var(--col-yellow-100));
  }
  .bottom-outline .left,
  .bottom-outline .right {
    border-top: 0.4rem solid var(--col-yellow-border);
    position: relative;
  }
  .bottom-outline .center {
    display: flex;
    width: 12rem;
    position: relative;
  }
  .bottom-outline .center .line {
    border-bottom: 0.5rem solid var(--col-yellow-border);
    flex-grow: 1;
  }
  .dark-overlay {
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)), linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 50.37%);
  }
  .dark-overlay div {
    width: 20%;
  }

  .cta-play {
    border: none;
    border-top: 0.8rem solid var(--col-yellow-100);
    border-bottom: 0.8rem solid var(--col-yellow-200);
    background: var(--col-yellow-300);
    font-family: Pixelar;
    font-size: 2em;
    padding: 1.2rem 0;
    line-height: 1;
    color: var(--col-white);
    text-align: center;
    clip-path: polygon(0% 0%, 100% 0%, calc(100% - 4.2rem) 100%, 4.2rem 100%);
    position: absolute;
    left: 1rem;
    right: 1rem;
    top: 0;
    bottom: 1.2rem;
    text-transform: uppercase;
  }
  .cta-play.inactive {
    border-top: 0.8rem solid var(--col-grey-300);
    border-bottom: 0.8rem solid var(--col-grey-500);
    background: var(--col-grey-400);
    color: rgba(255, 255, 255, 0.5);
  }
  .bottom-outline {
    display: flex;
    height: 8rem;
  }
  .bottom-outline .left,
  .bottom-outline .right {
    width: 5rem;
    border-top: 0.5rem solid var(--col-yellow-border);
    position: relative;
  }
  .bottom-outline .center {
    display: flex;
    flex-grow: 1;
  }
  .bottom-outline .center .bottom-line {
    height: 100%;
    flex-grow: 1;
    border-bottom: 0.5rem solid var(--col-yellow-border);
  }
  .bottom-outline .center .diag,
  .bottom-outline .center .anti-diag {
    width: 4.8rem;
    height: 100%;
  }
  .bottom-outline .center .diag {
    background: linear-gradient(
      to bottom left,
      transparent calc(50% - 2.5px),
      var(--col-yellow-border) calc(50% - 2.5px),
      var(--col-yellow-border) calc(50% + 2.5px),
      transparent calc(50% + 2.5px)
    );
  }
  .bottom-outline .center .anti-diag {
    background: linear-gradient(
      to bottom right,
      transparent calc(50% - 2.5px),
      var(--col-yellow-border) calc(50% - 2.5px),
      var(--col-yellow-border) calc(50% + 2.5px),
      transparent calc(50% + 2.5px)
    );
  }
  .combat-inactive {
    position: absolute;
    border: 0.5rem solid var(--col-yellow-border);
    left: 10px;
    right: 10px;
    top: 10px;
    bottom: 10px;
  }
  .lock-icon {
    position: relative;
    width: 10rem;
    height: 12rem;
  }
`;
