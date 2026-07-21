import css from 'styled-jsx/css';

export default css`
  .wrapper {
    filter: drop-shadow(0 0 0.8rem var(--col-pink-border));
    position: relative;
    max-width: 124rem;
    min-width: 124rem;
    padding: 0 8.4rem;
    margin: 0 auto;
  }

  .halloween.wrapper {
    filter: drop-shadow(0 0 0.8rem var(--col-halloween-border));
  }

  .close-icon-container {
    position: absolute;
    top: 0;
    right: -3rem;
  }

  .inner-container {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9) 75%, rgba(21, 21, 21, 0.9) 75%, rgba(21, 21, 21, 0.9));
    background-size: 100% 0.8rem;
    border: 0.4rem solid var(--col-pink-border);
    position: relative;
    padding: 2rem 3.2rem 1.2rem;
  }

  .halloween .inner-container {
    border: 0.4rem solid var(--col-halloween-border);
  }

  .title-panel {
    background-color: var(--col-black);
    border: 0.3rem solid var(--col-pink-border);
    /* box-shadow: 0 0 .8rem .2rem var(--col-pink-border); */
    border-radius: 0.6rem;
    padding: 1rem 0.8rem 1.4rem;
    position: absolute;
    z-index: 2;
    left: 50%;
    top: 0;
    max-width: 90%;
    width: 32rem;
    transform: translate(-50%, calc(-50% - 0.4rem));
  }

  .halloween .title-panel {
    border: 0.3rem solid var(--col-halloween-border);
    /* box-shadow: 0 0 .8rem .2rem var(--col-halloween-border); */
  }

  .title-panel h2 {
    text-align: center;
    color: var(--col-white);
    margin: 0;
    line-height: 1;
    text-transform: uppercase;
    font-size: 4.2rem;
  }

  .page-subtitle {
    text-align: center;
    margin: 0.4rem 0 0;
    color: var(--col-pink-200);
    font-size: 1.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .halloween .page-subtitle {
    color: var(--col-halloween-200);
  }

  .divider {
    height: calc(100% + 4.2rem);
    width: 0.4rem;
    position: absolute;
    left: calc(50% - 0.2rem);
    background-color: var(--col-pink-400);
    top: 0;
    z-index: 1;
    opacity: 0.8;
  }
  .halloween .divider {
    background-color: var(--col-halloween-400);
  }
  .bottom-notch {
    position: absolute;
    top: 100%;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9) 75%, rgba(21, 21, 21, 0.9) 75%, rgba(21, 21, 21, 0.9));
    background-size: 100% 0.8rem;
    background-position: 0 0.2rem;
    height: 4.2rem;
    width: 22%;
    border-bottom: 0.4rem solid var(--col-pink-border);
    border-right: 0.4rem solid var(--col-pink-border);
    border-left: 0.4rem solid var(--col-pink-border);
    left: 50%;
    transform: translateX(-50%);
  }
  .halloween .bottom-notch {
    border-bottom: 0.4rem solid var(--col-halloween-border);
    border-right: 0.4rem solid var(--col-halloween-border);
    border-left: 0.4rem solid var(--col-halloween-border);
  }

  .next-page-left,
  .next-page-right {
    position: absolute;
    width: 4.2rem;
    top: 3.8rem;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9) 75%, rgba(21, 21, 21, 0.9) 75%, rgba(21, 21, 21, 0.9));
    background-size: 100% 0.8rem;
    background-position: 0 0.6rem;

    height: calc(100% - 3.4rem);
    border-bottom: 0.4rem solid var(--col-pink-border);
    border-top: 0.4rem solid var(--col-pink-border);
    padding: 0;
    cursor: url('/cursors/pointer.png'), pointer;
  }

  .page-flap:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .page-flap:not(:disabled):hover {
    filter: brightness(1.15);
  }
  .halloween .next-page-left,
  .halloween .next-page-right {
    border-bottom: 0.4rem solid var(--col-halloween-border);
    border-top: 0.4rem solid var(--col-halloween-border);
  }
  .next-page-left {
    right: calc(100% + 0.4rem);
    border-left: 0.4rem solid var(--col-pink-border);
  }
  .halloween .next-page-left {
    border-left: 0.4rem solid var(--col-halloween-border);
  }
  .next-page-right {
    left: calc(100% + 0.4rem);
    border-right: 0.4rem solid var(--col-pink-border);
  }
  .halloween .next-page-right {
    border-right: 0.4rem solid var(--col-halloween-border);
  }

  .back-right-page,
  .back-left-page,
  .back-left-page-bottom,
  .back-right-page-bottom,
  .back-bottom-notch {
    position: absolute;
    background-color: rgba(200, 42, 194, 0.1);
  }

  .halloween .back-right-page,
  .halloween .back-left-page,
  .halloween .back-left-page-bottom,
  .halloween .back-right-page-bottom,
  .halloween .back-bottom-notch {
    background-color: rgba(236, 97, 19, 0.1);
  }

  .back-bottom-notch {
    top: calc(100% + 4.2rem);
    height: 4.2rem;
    width: calc(22% + 8.4rem);
    border-bottom: 0.4rem solid var(--col-pink-border);
    border-right: 0.4rem solid var(--col-pink-border);
    border-left: 0.4rem solid var(--col-pink-border);
    left: 50%;
    transform: translateX(-50%);
  }

  .halloween .back-bottom-notch {
    border-bottom: 0.4rem solid var(--col-halloween-border);
    border-right: 0.4rem solid var(--col-halloween-border);
    border-left: 0.4rem solid var(--col-halloween-border);
  }

  .back-left-page,
  .back-right-page {
    height: calc(100% - 6.3rem);
    width: 4.2rem;
    top: 8.4rem;
    border-top: 0.4rem solid var(--col-pink-border);
  }

  .page-tab {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .page-dots {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.6rem;
    padding: 1rem 0;
  }

  .page-dot {
    width: 1.4rem;
    height: 1.4rem;
    border-radius: 50%;
    border: 0.2rem solid var(--col-pink-400);
    background: rgba(255, 255, 255, 0.15);
    padding: 0;
    cursor: url('/cursors/pointer.png'), pointer;
    transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
  }

  .page-dot.active {
    background: var(--col-pink-400);
    box-shadow: 0 0 0.6rem var(--col-pink-400);
    transform: scale(1.15);
  }

  .halloween .page-dot {
    border-color: var(--col-halloween-400);
  }

  .halloween .page-dot.active {
    background: var(--col-halloween-400);
    box-shadow: 0 0 0.6rem var(--col-halloween-400);
  }

  .page-dot:hover {
    transform: scale(1.1);
  }
  .halloween .back-left-page,
  .halloween .back-right-page {
    border-top: 0.4rem solid var(--col-halloween-border);
  }
  .back-left-page {
    right: calc(100% + 4.6rem);
    border-left: 0.4rem solid var(--col-pink-border);
  }
  .halloween .back-left-page {
    border-left: 0.4rem solid var(--col-halloween-border);
  }
  .back-right-page {
    left: calc(100% + 4.6rem);
    border-right: 0.4rem solid var(--col-pink-border);
  }
  .halloween .back-right-page {
    border-right: 0.4rem solid var(--col-halloween-border);
  }
  .back-left-page:after,
  .back-right-page:after {
    height: 0.4rem;
    width: 50%;
    content: '';
    position: absolute;
    bottom: 0;
    background-color: var(--col-pink-border);
  }
  .halloween .back-left-page:after,
  .halloween .back-right-page:after {
    background-color: var(--col-halloween-border);
  }
  .back-right-page:after {
    right: 0;
  }
  .back-left-page:before,
  .back-right-page:before {
    height: 2.1rem;
    width: calc(50% + 0.4rem);
    content: '';
    position: absolute;
    top: 100%;
    background-color: rgba(200, 42, 194, 0.1);
  }
  .back-left-page:before {
    left: calc(50% - 0.4rem);
    border-left: 0.4rem solid var(--col-pink-400);
  }
  .halloween .back-left-page:before {
    border-left: 0.4rem solid var(--col-halloween-400);
  }
  .back-right-page:before {
    border-right: 0.4rem solid var(--col-pink-400);
  }
  .halloween .back-right-page:before {
    border-right: 0.4rem solid var(--col-halloween-400);
  }

  .back-left-page-bottom,
  .back-right-page-bottom {
    height: 4.2rem;
    width: calc(39% + 4.7rem);
    top: calc(100%);
  }
  .back-left-page-bottom:after,
  .back-right-page-bottom:after {
    content: '';
    position: absolute;
    top: calc(100% - 0.4rem);

    background-color: var(--col-pink-400);
    height: 0.4rem;
    width: calc(100% - 1.9rem);
  }
  .halloween .back-left-page-bottom:after,
  .halloween .back-right-page-bottom:after {
    background-color: var(--col-halloween-400);
  }
  .back-left-page-bottom:after {
    left: -1.9rem;
  }
  .back-right-page-bottom:after {
    right: -1.9rem;
  }
  .back-left-page-bottom {
    right: 61%;
  }
  .back-right-page-bottom {
    left: 61%;
  }
  .pumpkin-bottom {
    position: absolute;
    bottom: -6.5rem;
    z-index: 2;
  }
  .pumpkin-bottom.left {
    left: -11rem;
    width: 10.6rem;
    height: 14.4rem;
  }
  .pumpkin-bottom.right {
    right: -11.5rem;
    width: 13rem;
    height: 17rem;
  }
  .candle-bottom {
    position: absolute;
    bottom: -3.9rem;
  }
  .candle-bottom.left {
    left: -1.4rem;
    width: 5.5rem;
    height: 5.1rem;
  }
  .candle-bottom.right {
    right: 0.2rem;
    width: 3.6rem;
    height: 5rem;
  }
  .title-panel-contents {
    position: relative;
  }
  .candle-top {
    position: absolute;
    bottom: 2rem;
    width: 7rem;
    height: 8.7rem;
    z-index: 0;
  }
  .candle-top.left {
    left: -8rem;
  }
  .candle-top.right {
    right: -8.2rem;
  }
  .candle-top.center {
    top: -9.6rem;
    width: 14rem;
    height: 8.3rem;
    left: 50%;
    transform: translateX(-50%);
  }
  .candle-layer-1 {
    position: absolute;
    top: -2.2rem;
    z-index: 1;
    width: 4.4rem;
    height: 7rem;
  }
  .candle-layer-1.left {
    left: 4rem;
  }
  .candle-layer-1.right {
    right: 4rem;
    top: -2.7rem;
  }
  .candle-layer-2 {
    position: absolute;
    z-index: 1;
  }
  .candle-layer-2.left {
    left: 0.3rem;
    width: 3.5rem;
    height: 4.7rem;
    top: 4.2rem;
    transform: scaleX(-1);
  }
  .candle-layer-2.right {
    right: 1rem;
    width: 3.1rem;
    height: 3.2rem;
    top: 5.5rem;
  }
`;
