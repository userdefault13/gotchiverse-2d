import css from 'styled-jsx/css';

export default css`
  .gotchi-select-modal {
    position: relative;
    width: calc(100vw - 10rem);
    height: calc(100vh - 10rem);
    max-width: 180rem;
    max-height: 100rem;
    z-index: 1001;
    color: white;
    border-radius: 4rem;
    background: linear-gradient(0deg, rgba(19, 49, 154, 0.8), rgba(19, 49, 154, 0.1));
  }

  .bg-container {
    width: 100%;
    height: 100%;
    padding: 3rem 3rem 1rem 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bg-halloween {
    pointer-events: none;
  }

  .bg-img {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    overflow: hidden;
    border-radius: 4rem;
    z-index: -1;
  }
  .darken {
    background: linear-gradient(90deg, #000000 -1.07%, rgba(0, 0, 0, 0.5) 33.67%, rgba(0, 0, 0, 0.5) 68.94%, #000000 100%);
    opacity: 0.4;
  }
  .darken.connected {
    background: linear-gradient(90deg, #000000 0%, #000000 19.27%, rgba(0, 0, 0, 0) 48.96%, #000000 82.81%, #000000 100%);
    opacity: 0.8;
  }

  .desktop-view {
    display: none;
    position: relative;
    width: 100%;
    height: 100%;
    padding: 2rem 1rem;
  }

  .mobile-view {
    // padding: 5.4rem 3.2rem 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .mobile-logo {
    width: 100%;
    margin-bottom: 7.2rem;
  }

  .panel {
    border: 0.2rem solid #c82ac2;
    position: relative;
    height: 100%;
    color: white;
    padding: 4.2rem 2.4rem 2.4rem;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9) 50%, rgba(31, 31, 31, 0.9) 50%, rgba(31, 31, 31, 0.9));
    background-size: 100% 0.8rem;
    border-radius: 4.2rem;
  }
  .panel:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--col-gotchi-disabled-500);
    border: 2px solid var(--col-gotchi-disabled-400);
    box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25), inset 0px 0px 14px 3px #5e1fe4;
    background: linear-gradient(180deg, rgba(41, 0, 129, 0) -2.59%, #641dfa 84.5%);
    mix-blend-mode: multiply;
    opacity: 0.5;
    border-radius: 5px;
    z-index: 0;
    opacity: 0.45;
  }

  .panel p {
    text-align: center;
    font-size: 2.4rem;
  }

  .title-container {
    border-top: 0.2rem solid #c82ac2;
    background-color: black;
    box-shadow: 0 0 1.2rem 0.7rem #c82ac2;
    border-radius: 1.8rem;
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, -50%);
    text-transform: uppercase;
    padding: 0.8rem;
    min-width: 18rem;
  }
  .title-container h2 {
    margin: 0;
    padding: 0;
    font-size: 2.4rem;
    text-align: center;
  }

  .guide-text {
    font-size: 1.9em;
    color: #ffd28d;
    padding: 0 0.5rem;
    line-height: 0.8;
    -webkit-text-stroke-color: #ffd28d;
    font-weight: bold;
    // -webkit-text-stroke-width: 0.8rem;
  }

  .guide-text.secondary {
    color: var(--col-info-400);
    margin-left: -2rem;
  }

  .gotchi-name-container {
    margin-top: 6rem;
  }

  .gotchi-name {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1em;
    font-family: 'Kimberley Rg';
    font-size: 1.2rem;
    line-height: 1;
  }
  .gotchi-name h4 {
    font-size: 3.2em;
    text-align: center;
    color: var(--col-yellow-100);
  }
  .gotchi-caption {
    font-size: 1.8em;
    line-height: 1.65em;
    text-align: center;
  }

  @media (min-width: 768px) {
    .desktop-view {
      display: flex;
      align-items: stretch;
      justify-content: space-between;
    }

    /* Pack rails + tiny center preview; don't let space-between inflate the middle. */
    .desktop-view.mint-layout {
      justify-content: flex-start;
      gap: 1.6rem;
    }

    .desktop-view.mint-layout .gotchi-details.mint-mode {
      margin-left: auto;
    }

    .mobile-view {
      display: none;
    }

    @keyframes float {
      0% {
        transform: translateY(0rem);
      }
      50% {
        transform: translateY(-2rem);
      }
      100% {
        transform: translateY(0rem);
      }
    }

    .floor {
      position: absolute;
      bottom: -1.2rem;
      object-fit: cover;
      object-position: center;
      width: 100%;
      height: 29%;
    }

    .portal {
      position: absolute;
      bottom: 25%;
      left: 50%;
      transform: translateX(-50%);
      filter: blur(0.1rem) drop-shadow(0 0 5rem var(--col-rare-400));
      z-index: 0;
      width: 100%;
      height: 50rem;
      max-width: 40rem;
    }

    .portal.closed {
      filter: blur(0.2rem);
    }

    .gotchi-details {
      position: relative;
      width: 100%;
      height: 100%;
      max-width: 40rem;
      padding-top: 7.5rem;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      gap: 0;
    }

    .gotchi-details.mint-mode {
      flex: 1 1 46rem;
      padding-top: 2rem;
      max-width: 48rem;
      min-width: 34rem;
    }

    .selected-gotchi-container.mint-preview {
      pointer-events: auto;
      flex: 1 1 auto;
      width: auto;
      max-width: none;
      padding-bottom: 8rem;
      justify-content: flex-end;
      cursor: default;
    }

    /* Label lives in hover tip — keep layout space free for the hero art. */
    .selected-gotchi-container.mint-preview .gotchi-name-container {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .selected-gotchi-container.mint-preview .mint-preview-tip {
      position: absolute;
      left: 50%;
      bottom: 4rem;
      transform: translateX(-50%);
      z-index: 5;
      min-width: 18rem;
      max-width: min(36rem, 70vw);
      padding: 0.8rem 1.1rem;
      border-radius: 0.45rem;
      border: 0.18rem solid rgba(255, 122, 233, 0.75);
      background: rgba(18, 4, 32, 0.96);
      box-shadow: 0 0 16px rgba(0, 0, 0, 0.55), 0 0 10px rgba(255, 122, 233, 0.35);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.12s ease-in-out;
      text-align: center;
    }

    .selected-gotchi-container.mint-preview:hover .mint-preview-tip,
    .selected-gotchi-container.mint-preview:focus-within .mint-preview-tip {
      opacity: 1;
    }

    .selected-gotchi-container.mint-preview .mint-preview-tip .tip-title {
      display: block;
      font-family: Pixelar, sans-serif;
      font-size: 2.4rem;
      line-height: 1.1;
      background: -webkit-linear-gradient(#ffa24d, #ffe600);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.6));
      margin-bottom: 0.3rem;
    }

    .selected-gotchi-container.mint-preview .mint-preview-tip .tip-caption {
      display: block;
      font-size: 1.35rem;
      line-height: 1.3;
      color: rgba(255, 255, 255, 0.9);
    }

    /* Wearable mint catalog — middle column (browse / add to cart). */
    .selected-gotchi-container.mint-catalog {
      pointer-events: auto;
      flex: 1 1 46rem;
      width: min(48rem, 100%);
      max-width: 48rem;
      min-width: 34rem;
      min-height: 0;
      height: auto;
      max-height: calc(100% - 2rem);
      padding: 1.2rem 1rem 1.5rem;
      justify-content: flex-start;
      align-items: stretch;
      align-self: stretch;
      overflow: hidden;
    }

    /* Wearable cart — right rail checkout. */
    .gotchi-details.mint-mode.mint-cart {
      flex: 1 1 28rem;
      width: min(36rem, 100%);
      max-width: 36rem;
      min-width: 22rem;
      padding: 1.2rem 1rem 1.5rem;
      background: rgba(28, 4, 42, 0.72);
      border: 0.2rem solid rgba(255, 122, 233, 0.45);
      border-radius: 0.5rem;
      box-shadow: inset 0 0 24px 4px rgba(255, 122, 233, 0.12);
      overflow: hidden;
    }


    .cartridge-preview-img,
    .collateral-preview-svg {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .collateral-preview-svg :global(svg) {
      width: 100%;
      height: 100%;
    }
    .spawn-location-container {
      position: relative;
      margin-top: 4rem;
    }

    .enter-container {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      top: 15rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 2;
    }
    .enter-container span {
      animation: float 2s ease-in-out infinite;
    }
    header {
      position: absolute;
      padding: 2.4rem;
      width: 100%;
    }

    .header-link-container {
      display: flex;
      justify-content: space-between;
    }

    .game-metadetails {
      color: white;
      position: relative;
      z-index: 10;
      text-align: center;
    }

    .verify-icon {
      position: absolute;
      top: -0.8rem;
      right: -0.8rem;
      filter: drop-shadow(0 0 0.2rem black);
    }

    .web3button-container {
      display: flex;
      justify-content: flex-end;
    }

    .web3button-container a {
      text-decoration: none;
      padding-right: 0.5rem;
    }

    .bg-image {
      display: block;
    }
    .logo {
      width: 35rem;
      z-index: 1;
    }

    .back_menu {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      bottom: 2.5rem;
      z-index: 10;
    }

    .selected-gotchi-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      padding-bottom: 8rem;
    }
    .selected-gotchi-container .glow {
      position: absolute;
      border-radius: 50%;
      width: 64rem;
      height: 20rem;
      background: var(--col-info-400);
      opacity: 0.5;
      bottom: 15%;
      -webkit-filter: blur(7rem);
      left: 50%;
      transform: translateX(-50%) scale(0.5, 0.25);
      z-index: -1;
    }

    .selected-gotchi-container.enter-anim .gotchi {
      animation: enter 4000ms;
      transform: translateX(0%, 0%) scale(0.5);
      opacity: 0.3;
    }
    // .selected-gotchi-container.spectator.enter-anim .gotchi {
    //   animation: enter 4000ms;
    //   transform: translateX(0%, 0%) scale(0.5);
    //   opacity: 0.3;
    // }

    @keyframes enter {
      0% {
        transform: translate(0%, 0%) scale(1);
        opacity: 1;
      }
      50% {
        opacity: 1;
      }
      60% {
        transform: translate(0%, -15%) scale(0.5);
      }
      100% {
        transform: translate(0%, -15%) scale(0.5);
        opacity: 0.1;
      }
    }
  }

  .close-button-container {
    position: absolute;
    right: 4rem;
    top: 3rem;
    z-index: 10;
  }

  .close-button-container:active {
    transform: scale(1.2);
  }

  .cta-last-position {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 1rem auto;
    border: none;
    background: none;
  }

  .cta-last-position .location-icon {
    width: 2rem;
    height: 2rem;
  }

  .cta-last-position span {
    display: inline-block;
    text-align: left;
    text-transform: uppercase;
    font-family: 'Kimberley Rg';
    font-size: 1.6rem;
    line-height: 1.2rem;
    margin: 0 0.25rem;
    color: var(--col-info-800);
  }

  .manage-hero-overlay {
    position: fixed;
    inset: 0;
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.65);
    padding: 2rem;
  }

  .manage-hero-modal {
    position: relative;
    width: min(42rem, 100%);
    border-radius: 1.6rem;
    border: 0.25rem solid #c82ac2;
    background: linear-gradient(180deg, rgba(41, 0, 129, 0.95), rgba(10, 8, 40, 0.98));
    padding: 2.4rem 2rem 2rem;
    color: #fff;
    box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.45);
  }

  .manage-hero-close {
    position: absolute;
    top: 0.6rem;
    right: 1rem;
    appearance: none;
    border: none;
    background: transparent;
    color: #fff;
    font-size: 2.8rem;
    line-height: 1;
    cursor: pointer;
  }

  .manage-hero-title {
    margin: 0 0 0.6rem;
    font-family: 'Kimberley Bl', sans-serif;
    font-size: 2.4rem;
    text-transform: uppercase;
    background: -webkit-linear-gradient(#ffa24d, #ffe600);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .manage-hero-name {
    margin: 0 0 1rem;
    font-size: 1.8rem;
    color: #ff7ae9;
  }

  .manage-hero-body {
    margin: 0 0 1.6rem;
    font-size: 1.5rem;
    line-height: 1.35;
    color: rgba(255, 255, 255, 0.85);
  }

  .manage-hero-cta {
    appearance: none;
    width: 100%;
    border: none;
    border-radius: 0.8rem;
    padding: 1rem 1.2rem;
    font-family: 'Kimberley Rg', sans-serif;
    font-size: 1.6rem;
    text-transform: uppercase;
    color: #fff;
    background: #c82ac2;
    cursor: pointer;
  }
`;
