import css from 'styled-jsx/css';

export default css`
  .button-wrapper {
    --border-width: 0.25rem;
    --cap-size: 0.2em;
    --tri-spacer: 30%;

    background: none;
    border: none;
    width: 3em;
    height: 3em;
    padding: 0 var(--cap-size);
    filter: drop-shadow(0 0 0.4rem var(--color));
  }

  .text-button-wrapper {
    --border-width: 0.3rem;
    --cap-size: 0.2em;
    --tri-spacer: 30%;

    background: none;
    border: none;
    width: 6em;
    height: 3em;
    padding: 0 var(--cap-size);
    filter: drop-shadow(0 0 0.4rem var(--color));
  }

  .outer {
    border-top: var(--border-width) solid var(--color);
    border-bottom: var(--border-width) solid var(--color);
    height: 100%;
    width: 100%;
    position: relative;
    box-sizing: border-box;
  }

  .cap {
    position: absolute;
    top: calc(var(--cap-size) - var(--border-width));
    height: calc(100% - 2 * var(--cap-size) + var(--border-width) * 2);
    border-top: var(--border-width) solid var(--color);
    border-bottom: var(--border-width) solid var(--color);
    width: var(--cap-size);
  }
  .cap.left {
    border-left: var(--border-width) solid var(--color);
    left: calc(-1 * var(--cap-size) - var(--border-width));
  }
  .cap.right {
    border-right: var(--border-width) solid var(--color);
    right: calc(-1 * var(--cap-size) - var(--border-width));
  }

  .cap:before,
  .cap:after {
    content: '';
    position: absolute;
    width: var(--border-width);
    height: calc(var(--cap-size) + var(--border-width));
    background-color: var(--color);
  }

  .cap:after {
    top: calc(-1 * var(--cap-size) - var(--border-width));
  }
  .cap:before {
    bottom: calc(-1 * var(--cap-size) - var(--border-width));
  }

  .cap.left:after,
  .cap.left:before {
    right: calc(-1 * var(--border-width));
  }

  .cap.right:after,
  .cap.right:before {
    left: calc(-1 * var(--border-width));
  }

  .inner {
    position: absolute;

    background-color: var(--color);
    width: calc(100% + var(--cap-size));
    height: calc(100% - var(--cap-size));
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .inner.clip-path-default {
    clip-path: polygon(
      0% var(--cap-size),
      var(--cap-size) var(--cap-size),
      var(--cap-size) 0%,
      calc(100% - var(--cap-size)) 0%,
      calc(100% - var(--cap-size)) var(--cap-size),
      100% var(--cap-size),
      100% calc(100% - var(--cap-size)),
      calc(100% - var(--cap-size)) calc(100% - var(--cap-size)),
      calc(100% - var(--cap-size)) 100%,
      var(--cap-size) 100%,
      var(--cap-size) calc(100% - var(--cap-size)),
      0% calc(100% - var(--cap-size))
    );
  }

  .inner.clip-path-triangle {
    clip-path: polygon(
      0% var(--cap-size),
      var(--cap-size) var(--cap-size),
      var(--cap-size) 0%,
      calc(100% - var(--cap-size)) 0%,
      calc(100% - var(--cap-size)) var(--tri-spacer),
      100% 50%,
      calc(100% - var(--cap-size)) calc(100% - var(--tri-spacer)),
      calc(100% - var(--cap-size)) 100%,
      var(--cap-size) 100%,
      var(--cap-size) calc(100% - var(--cap-size)),
      0% calc(100% - var(--cap-size))
    );
  }

  .text-button-inner {
    position: absolute;
    background-color: var(--color);
    width: calc(100% + 0.2em);
    height: calc(100% - 0.2em);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    justify-content: right;
    clip-path: polygon(
      0% var(--cap-size),
      var(--cap-size) var(--cap-size),
      var(--cap-size) 0%,
      calc(100% - 0.3rem) 0%,
      calc(100% - 0.3rem) 100%,
      var(--cap-size) 100%,
      var(--cap-size) calc(100% - var(--cap-size)),
      0% calc(100% - var(--cap-size))
    );
  }

  .inner .img-container {
    position: relative;
    width: calc(100% - 0.6rem);
    height: calc(100% - 0.6rem);
  }

  .inner.clip-path-default .img-container {
    clip-path: polygon(
      0% var(--cap-size),
      var(--cap-size) var(--cap-size),
      var(--cap-size) 0%,
      calc(100% - var(--cap-size)) 0%,
      calc(100% - var(--cap-size)) var(--cap-size),
      100% var(--cap-size),
      100% calc(100% - var(--cap-size)),
      calc(100% - var(--cap-size)) calc(100% - var(--cap-size)),
      calc(100% - var(--cap-size)) 100%,
      var(--cap-size) 100%,
      var(--cap-size) calc(100% - var(--cap-size)),
      0% calc(100% - var(--cap-size))
    );
  }

  .inner.clip-path-triangle .img-container {
    clip-path: polygon(
      0% var(--cap-size),
      var(--cap-size) var(--cap-size),
      var(--cap-size) 0%,
      calc(100% - var(--cap-size)) 0%,
      calc(100% - var(--cap-size)) var(--tri-spacer),
      100% 50%,
      calc(100% - var(--cap-size)) calc(100% - var(--tri-spacer)),
      calc(100% - var(--cap-size)) 100%,
      var(--cap-size) 100%,
      var(--cap-size) calc(100% - var(--cap-size)),
      0% calc(100% - var(--cap-size))
    );
  }

  .text-button-inner .img-container {
    position: relative;
    width: calc(100% - 0.3rem);
    height: calc(100% - 0.6rem);
  }

  .text-button-inner .img-container {
    clip-path: polygon(
      0% var(--cap-size),
      var(--cap-size) var(--cap-size),
      var(--cap-size) 0%,
      100% 0%,
      100% 100%,
      var(--cap-size) 100%,
      var(--cap-size) calc(100% - var(--cap-size)),
      0% calc(100% - var(--cap-size))
    );
  }

  /* hover */
  .button-wrapper:hover {
    filter: drop-shadow(0 0 0.4rem var(--hover-color));
  }

  .button-wrapper:hover .outer,
  .button-wrapper:hover .cap,
  .button-wrapper:hover .cap.left,
  .button-wrapper:hover .cap.right {
    border-color: var(--hover-color);
  }

  .button-wrapper:hover .cap:before,
  .button-wrapper:hover .cap:after {
    background-color: var(--hover-color);
  }

  /* Color variants */
  .button-wrapper.info {
    filter: drop-shadow(0 0 0.4rem var(--col-info-400));
  }
  .button-wrapper.info .outer,
  .button-wrapper.info .cap,
  .button-wrapper.info .cap.left,
  .button-wrapper.info .cap.right {
    border-color: var(--col-info-400);
  }

  .button-wrapper.info:before,
  .button-wrapper.info:after,
  .button-wrapper.info .inner,
  .button-wrapper.info .cap:before,
  .button-wrapper.info .cap:after {
    background-color: var(--col-info-400);
  }

  /* hover */
  .button-wrapper.info:hover {
    filter: drop-shadow(0 0 0.4rem var(--col-info-300));
  }
  .button-wrapper.info:hover .outer,
  .button-wrapper.info:hover .cap,
  .button-wrapper.info:hover .cap.left,
  .button-wrapper.info:hover .cap.right {
    border-color: var(--col-info-300);
  }

  .button-wrapper.info:hover .cap:before,
  .button-wrapper.info:hover .cap:after {
    background-color: var(--col-info-300);
  }

  /* Halloween Color variants */

  .button-wrapper.halloween {
    filter: drop-shadow(0 0 0.4rem var(--col-halloween-400));
  }
  .button-wrapper.halloween .outer,
  .button-wrapper.halloween .cap,
  .button-wrapper.halloween .cap.left,
  .button-wrapper.halloween .cap.right {
    border-color: var(--col-halloween-400);
  }

  .button-wrapper.halloween:before,
  .button-wrapper.halloween:after,
  .button-wrapper.halloween .inner,
  .button-wrapper.halloween .cap:before,
  .button-wrapper.halloween .cap:after {
    background-color: var(--col-halloween-400);
  }

  /* hover */
  .button-wrapper.halloween:hover {
    filter: drop-shadow(0 0 0.4rem var(--col-halloween-300));
  }
  .button-wrapper.halloween:hover .outer,
  .button-wrapper.halloween:hover .cap,
  .button-wrapper.halloween:hover .cap.left,
  .button-wrapper.halloween:hover .cap.right {
    border-color: var(--col-halloween-300);
  }

  .button-wrapper.halloween:hover .cap:before,
  .button-wrapper.halloween:hover .cap:after {
    background-color: var(--col-halloween-300);
  }

  /* build-button mode color begins */

  /* hover */
  .text-button-wrapper:hover {
    filter: drop-shadow(0 0 0.4rem var(--hover-color));
  }

  .text-button-wrapper:hover .outer,
  .text-button-wrapper:hover .cap,
  .text-button-wrapper:hover .cap.left,
  .text-button-wrapper:hover .cap.right {
    border-color: var(--hover-color);
  }

  .text-button-wrapper:hover .cap:before,
  .text-button-wrapper:hover .cap:after {
    background-color: var(--hover-color);
  }

  /* Color variants */
  .text-button-wrapper.info {
    filter: drop-shadow(0 0 0.4rem var(--col-info-400));
  }
  .text-button-wrapper.info .outer,
  .text-button-wrapper.info .cap,
  .text-button-wrapper.info .cap.left,
  .text-button-wrapper.info .cap.right {
    border-color: var(--col-info-400);
  }

  .text-button-wrapper.info:before,
  .text-button-wrapper.info:after,
  .text-button-wrapper.info .inner,
  .text-button-wrapper.info .cap:before,
  .text-button-wrapper.info .cap:after {
    background-color: var(--col-info-400);
  }

  /* hover */
  .text-button-wrapper.info:hover {
    filter: drop-shadow(0 0 0.4rem var(--col-info-300));
  }
  .text-button-wrapper.info:hover .outer,
  .text-button-wrapper.info:hover .cap,
  .text-button-wrapper.info:hover .cap.left,
  .text-button-wrapper.info:hover .cap.right {
    border-color: var(--col-info-300);
  }

  .text-button-wrapper.info:hover .cap:before,
  .text-button-wrapper.info:hover .cap:after {
    background-color: var(--col-info-300);
  }

  h2 {
    position: absolute;
    font-size: 3.6rem;
    margin-left: 8.5rem;
    line-height: 2.5rem;
    color: var(--color);
  }
  h2.halloween {
    color: var(--col-halloween-400);
  }
  h2.alien {
    font-family: 'Alien Encounters Solid';
    font-size: 2.8rem;
    line-height: 2.5rem;
    margin: 0.3rem 0 0 9rem;
    color: var(--col-info-800);
  }

  @media (max-width: 1400px) {
    .cap:before,
    .cap:after {
      height: calc(var(--cap-size) + var(--border-width) * 0.75);
    }

    .cap:after {
      top: calc(-1 * var(--cap-size) - var(--border-width) * 0.75);
    }
    .cap:before {
      bottom: calc(-1 * var(--cap-size) - var(--border-width) * 0.75);
    }
  }
`;
