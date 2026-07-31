import css from 'styled-jsx/css';

export default css`
  .lodge-build-root {
    --col-blue-border: var(--col-pink-300);
    --col-info-400: var(--col-pink-300);
    --col-info-500: var(--col-pink-400);
    position: fixed;
    inset: 0;
    z-index: 46;
    pointer-events: none;
  }

  .build-border {
    position: absolute;
    pointer-events: none;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    border: 0.2rem solid var(--col-pink-300);
    box-shadow: inset 0rem 0rem 2.4rem rgba(255, 43, 214, 0.75);
  }

  .right-container {
    position: absolute;
    right: 0;
    top: 3.2rem;
    bottom: 1.2rem;
    display: flex;
    pointer-events: auto;
    opacity: 0.9;
    transition: opacity 0.2s ease-in-out;
  }
  .right-container:hover {
    opacity: 1;
  }

  .map-pan {
    position: absolute;
    left: 1.2rem;
    bottom: 1.2rem;
    z-index: 2;
    pointer-events: auto;
    display: flex;
    gap: 0.6rem;
    opacity: 0.92;
  }
  .map-pan:hover {
    opacity: 1;
  }

  .panel-wrapper {
    position: relative;
  }

  .sidetray-content {
    width: 40rem;
    height: 100%;
    padding: 0 1.2rem 1.2rem 2rem;
  }

  .tab-container {
    position: absolute;
    bottom: -0.6rem;
    right: calc(100% - 1.5rem);
    z-index: 3;
  }

  .build-tools {
    position: absolute;
    bottom: 1.2rem;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: auto;
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    align-items: center;
    justify-content: center;
    max-width: min(90vw, 56rem);
    padding: 0.8rem 1.2rem;
    background: rgba(40, 0, 36, 0.88);
    border: 2px solid var(--col-pink-300);
    opacity: 0.9;
  }
  .build-tools:hover {
    opacity: 1;
  }

  .build-toggle {
    position: absolute;
    bottom: 1.2rem;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    opacity: 0.9;
  }
  .build-toggle:hover {
    opacity: 1;
  }
  .batch-msg {
    padding-bottom: 1.2rem;
    color: #fff;
    font-size: 2.2rem;
    text-align: center;
    line-height: 0.9;
  }
  .batch-msg :global(.ok) {
    color: var(--col-pink-300);
  }

  .floor-tile-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    width: 100%;
    justify-content: center;
  }
  .floor-tile-label {
    font-size: 1.2rem;
    color: var(--col-pink-300);
  }
  .floor-tile-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .floor-tile-chip {
    width: 3.2rem;
    height: 3.2rem;
    border: 2px solid transparent;
    background-size: cover;
    background-position: center;
    image-rendering: pixelated;
    cursor: pointer;
  }
  .floor-tile-chip.active {
    border-color: var(--col-pink-300);
  }
  .muted {
    color: #c98bbf;
    font-size: 1.2rem;
  }
`;
