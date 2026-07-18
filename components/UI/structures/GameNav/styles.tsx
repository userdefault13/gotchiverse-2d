import css from 'styled-jsx/css';

export default css`
  .game-nav-component {
    height: 5rem;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    border-bottom: 2px solid var(--col-purple-300);
    display: flex;
    justify-content: space-between;
    /* Above Phaser canvas (fixed, full viewport) */
    z-index: 10000;
    pointer-events: auto;
  }

  .content {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .content.alchemica {
    flex: 1;
  }

  .content.settings {
    margin-right: 1rem;
    cursor: url('/cursors/pointer.png'), pointer;
  }

  .icon {
    width: 2rem;
    height: 2rem;
  }

  .token-manager-wrapper {
    position: absolute;
    width: 39rem;
    top: 5rem;
    left: 0;
  }

  .logo-wrapper {
    width: 100%;
    max-width: 5rem;
    margin: 0 2rem 0 1.5rem;
  }
  .token-mananger-container.open {
    width: 39rem;
    background: linear-gradient(to top, rgba(27, 145, 255, 0.8) 0%, rgba(0, 185, 225, 0) 65.1%);
  }

  .button-wrapper {
    height: 100%;
  }
  .player-wallet-container {
    height: 100%;
    margin-left: 1rem;
  }

  .icon-toggle {
    margin: 0 0.5rem;
    margin-top: 0rem;
    height: 100%;
  }

  .logout-btn {
    appearance: none;
    background: transparent;
    border: 0;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: url('/cursors/pointer.png'), pointer;
  }

  .settings-menu-container {
    margin: 0 0.5rem;
  }

  .nav-button {
    position: relative;
    margin-right: 1rem;
    z-index: 1;
    padding: 0 1rem;
    height: calc(100% + 6px);
    background: linear-gradient(0deg, rgba(131, 72, 255, 0.7) 0%, rgba(131, 72, 255, 0) 100%);
    border-bottom: 4px solid var(--col-purple-300);
    cursor: url('/cursors/pointer.png'), pointer;
  }

  // Custom button color
  .nav-button.info {
    background: linear-gradient(0deg, #48abff 0%, rgba(72, 171, 255, 0.17) 37.5%, rgba(72, 171, 255, 0) 100%);
    border-bottom: 4px solid var(--col-info-200);
  }

  .nav-toggle {
    margin-top: 1rem;
    font-family: 'Alien Encounters Solid';
    color: var(--col-purple-300);
    text-transform: uppercase;
    font-size: 1.5rem;
    line-height: 1.2;
  }

  .token-mananger-container.open .nav-toggle {
    color: var(--col-info-200);
  }
  .nav-button.info .nav-toggle {
    color: var(--col-info-200);
  }

  .toggle-icon {
    margin-left: 0.4rem;
    margin-top: 0.5rem;
  }

  .minimap-icon {
    position: relative;
    margin-top: 0.5rem;
    width: 5rem;
    height: 4rem;
  }

  .minimap-container {
    position: absolute;
    top: 6.9rem;
    width: 200px;
    height: 202px;
    left: 10px;
  }

  @media screen and (max-width: 1400px), screen and (max-height: 900px) {
    .minimap-container {
      top: 7.1rem;
    }
  }

  @media screen and (max-width: 1200px), screen and (max-height: 750px) {
    .minimap-container {
      top: 7.4rem;
    }
  }

  .minimap-border {
    width: 100%;
    height: 100%;
    border: 4px solid var(--col-purple-300);
    border-radius: 2px;
  }
  .minimap-zoom-controls {
    display: flex;
    align-items: center;
    position: absolute;
    bottom: -1rem;
    left: 50%;
    transform: translateX(-50%);
    background: #18003a;
    height: 2rem;
  }
  .minimap-zoom-controls .divider {
    width: 3px;
    height: calc(100% - 4px);
    background: var(--col-purple-300);
  }

  .purple {
    color: var(--col-purple-200);
  }

  .location-info {
    font-size: 2rem;
    text-stroke: 1px black;
    color: white;
    font-weight: bold;
    line-height: 0.9;
    margin-top: 0.4rem;
  }

  .location-row {
    width: 100%;
    gap: 0.4rem;
  }

  .super-chat-toggle {
    width: 15rem;
  }
  .global-pos {
    margin-left: 0.5rem;
  }

  // Opacity overrides for HUD elements
  .token-manager-wrapper,
  .minimap-container {
    opacity: 0.85;
    transition: opacity 0.2s ease-in-out;
  }
  .token-manager-wrapper:hover,
  .minimap-container:hover {
    opacity: 1;
  }
`;
