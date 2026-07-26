import css from 'styled-jsx/css';

export default css`
  .player-dashboard-component {
    --cap-size: 1.5em;

    font-size: 1rem;
  }

  .gotchi-traits-container .image-wrapper {
    border-top: 2px solid var(--border-color);
  }

  .traits-wrapper {
    background: var(--col-purple-900);
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    border-top: 2px solid var(--border-color);
    transition: all 0.3s ease;
    padding: 0.5em 0 0.5em 0.5em;
    min-width: 5.5em;
  }

  .traits-spacer {
    position: relative;
    width: var(--cap-size);
    background: var(--border-color);
    clip-path: polygon(0 100%, 100% 100%, 100% var(--cap-size), calc(100% - var(--cap-size)) 0, 0 0);
  }

  .traits-spacer.short {
    clip-path: none;
    background: var(--col-purple-900);
    border-top: 2px solid var(--border-color);
  }

  .traits-spacer:before,
  .traits-spacer:after {
    position: absolute;
    content: '';
    top: 3px;
    right: 0;
    width: 100%;
    height: 100%;
    background: var(--col-purple-900);
    clip-path: polygon(0 100%, 100% 100%, 100% var(--cap-size), calc(100% - var(--cap-size)) 0);
    z-index: -1;
  }
  .traits-spacer.short:before,
  .traits-spacer.short:after {
    width: 2px;
    background: var(--border-color);
    z-index: 1;
  }

  .traits-spacer.short:before {
    height: 3em;
    top: calc(-1 * var(--cap-size));
    bottom: auto;
  }
  .traits-spacer.short:after {
    height: calc(100% - var(--cap-size) + 0.1em);
    bottom: 0;
    top: auto;
  }

  .info-container {
    position: relative;
    border-top: 0.2em solid var(--border-color);
    padding-right: 2em;
    display: flex;
    height: calc(100% - var(--cap-size));
    transform: translateY(calc(var(--cap-size))) translateX(-0.1em);
    justify-content: center;
    flex-direction: column;
  }

  .info-table {
    min-width: 28rem;
    width: 100%;
    height: auto;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: stretch;
    gap: 0.5em;
  }

  .toggle-button {
    position: absolute;
    top: var(--cap-size);
    right: 1em;
    transform: translateX(50%) translateY(-0.1em);
    filter: drop-shadow(0px 0px 2px var(--border-color));
  }

  .toggle-button.short {
    top: 1.5em;
    right: -0.5em;
  }

  .shape-down {
    min-height: 100%;
    width: 1em;
    position: relative;
    top: 0.3em;
    clip-path: polygon(0 0, 1em 1em, 100% 100%, 0 100%);
    background: var(--border-color);
  }

  .shape-down-border {
    min-height: 100%;
    position: relative;
    width: 1em;
    clip-path: polygon(0 0, 1em 1em, 100% 100%, 0 100%);
    background: var(--border-color);
  }

  .gotchi-name {
    display: block;
    font-size: 1.6em;
    line-height: 1;
    color: white;
    padding: 0.4em 1em;
    max-width: 10em;
  }
  .gotchi-name.bg-yellow {
    background: linear-gradient(to right, rgba(255, 191, 27, 0.5) 10.47%, rgba(87, 63, 0, 0) 91.4%);
  }

  .gotchi-name.bg-pink {
    background: linear-gradient(90deg, rgba(200, 42, 194, 0.64) 30.37%, rgba(200, 42, 194, 0) 104.14%);
  }

  .alchemica-value {
    font-size: 1.6em;
    line-height: 1;
  }
  .alchemica-value.fud {
    color: var(--col-text-fud);
    text-shadow: 0.2px 0.1px var(--col-text-fud);
  }
  .alchemica-value.fomo {
    color: var(--col-text-fomo);
    text-shadow: 0.2px 0.1px var(--col-text-fomo);
  }
  .alchemica-value.alpha {
    color: var(--col-text-alpha);
    text-shadow: 0.2px 0.1px var(--col-text-alpha);
  }
  .alchemica-value.kek {
    color: var(--col-text-kek);
    text-shadow: 0.2px 0.1px var(--col-text-kek);
  }
  .carried-alchemica-content {
    position: relative;
    color: white;
    background: linear-gradient(270deg, rgba(94, 21, 249, 0.56) 5.04%, rgba(94, 21, 249, 0.35) 38.82%, rgba(94, 21, 249, 0.182) 96.81%);
    border-radius: 1px;
    flex-grow: 1;
    padding-left: 0.5em;
    padding-right: 1.5em;
    height: 3.8em;
    margin-left: 0.8em;
    clip-path: polygon(0 0, calc(100% - 1em) 0, 100% 50%, calc(100% - 1em) 100%, 0% 100%);
    align-items: center;
  }

  .total-collected-alchemica {
    width: 4.5em;
    height: 3em;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 1em 50%);
    background: linear-gradient(180deg, rgba(94, 21, 249, 0.55) -25.64%, rgba(102, 49, 255, 0.8) 61.57%);
    border-radius: 2px;
    margin-left: -0.5em;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    padding-right: 0.5em;
  }
  .alchemica-carrying-capacity {
    font-size: 1.5em;
    line-height: 0.8;
    color: var(--col-info-200);
    text-shadow: 0.2px 0.1px var(--col-info-200);
  }
  .collected-alchemica {
    font-size: 1.6em;
    line-height: 1;
    color: var(--col-white);
    text-shadow: 0.2px 0.1px var(--col-text-white);
  }
  .alchemica {
    flex: 1 0 25%;
    align-items: center;
    justify-content: center;
    gap: 0.35em;
  }

  .alchemica-item-image-wrapper {
    position: relative;
    width: 3.6em;
    height: 3.6em;
    flex: 0 0 3.6em;
  }

  .trait-details {
    font-size: 1.3em;
    display: flex;
    align-items: baseline;
    justify-content: start;
    gap: 0.4em;
    align-content: start;
    justify-items: start;
  }
  .trait-icon {
    width: 1.2em;
    height: 1.2em;
    position: relative;
    opacity: 1;
    transition: opacity 0.2s;
    align-self: center;
    flex: 1 0 1.2em;
  }
  .trait-name {
    max-width: 11em;
    padding-left: 0.6em;
    color: var(--col-white);
  }
  .trait-value {
    display: flex;
    white-space: nowrap;
    flex: 1 0 100%;
  }
  .trait-value .value {
    color: var(--col-white);
    font-size: 1.2em;
    line-height: 1;
  }
  .trait-value .increase {
    color: var(--border-color);
  }
  .trait-value .desc {
    color: var(--col-white);
    padding-left: 0.2em;
    white-space: nowrap;
  }

  .player-dashboard-component.short .trait-icon {
    opacity: 0.6;
  }
  .health-bars {
    display: flex;
    flex-direction: column;
    gap: 0.8em;
    width: 100%;
    margin-left: 0.5em;
  }
  .lootbag-icon {
    width: 2.4em;
    height: 2.8em;
    position: relative;
  }
  .alchemica-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .hp-bar,
  .ap-bar {
    min-width: 32em;
    width: 100%;
    min-height: 1.5em;
  }

  .tooltip-container {
    position: absolute;
    background: linear-gradient(0deg, rgba(24, 7, 71, 0.7), rgba(24, 7, 71, 0.7)), rgba(0, 0, 0, 0.6);
    border: 1px solid var(--border-color);
    box-shadow: 0px 3px 14px rgba(17, 0, 38, 0.8);
    border-radius: 3px;
    padding: 0.5em;
    transition: all 0.2s ease-in-out;
    visibility: hidden;
    opacity: 0;
    mouse-events: none;
    z-index: 100;
    bottom: 5em;
    left: 5em;
  }
  .tooltip-container.visible {
    visibility: visible;
    opacity: 1;
  }
  .tooltip-container .trait-details {
    line-height: 0.9;
    gap: 0;
    font-size: 1.5em;
    grid-template-columns: 1.5em 0.25fr 0.5fr;
  }
  .tooltip-container .trait-icon {
    width: 1.5em;
    height: 1.5em;
  }
  .tooltip-container .trait-value {
    padding-left: 0.25em;
  }

  @media (max-width: 1200px) {
    .hp-bar,
    .ap-bar {
      min-width: 24em;
      width: 100%;
      min-height: 1.2em;
    }
  }
`;
