import css from 'styled-jsx/css';

export default css`
  .header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: space-between;
  }
  h4 {
    font-size: 2.8rem;
    color: var(--col-pink-200);
  }
  p {
    font-size: 2.5rem;
    line-height: 1.2;
  }
  .level-info {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .level-info h4 {
    font-family: Pixelar, sans-serif;
    margin: 0;
    padding: 0;
    color: var(--col-pink-200);
    font-size: 1.5rem;
    line-height: 1.2;
  }
  .xp-bar {
    width: 100%;
    height: 1.2rem;
    background-color: var(--col-grey-800);
    opacity: 0.8;
    margin: 1.2rem auto 2.4rem auto;
  }
  .xp-bar .progress {
    background-color: var(--col-pink-400);
    height: 100%;
  }
  .level-info .info {
    font-family: Pixelar, sans-serif;
    color: var(--col-info-200);
    font-size: 1.5rem;
    line-height: 1.2;
  }

  .in-game-container,
  .on-chain-container {
    height: 24rem;
    padding: 1rem 1rem 2.5rem 2.5rem;
  }

  .in-game-container {
    display: grid;
    grid-flow: column;
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 1fr;
    grid-gap: 1.5rem 2.5rem;
  }
  .in-game-container .col {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: 1.5rem 2.5rem;
  }

  .on-chain-container {
    padding-bottom: 3.5rem;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 1fr;
    grid-gap: 0.5rem 2.5rem;
  }

  .trait {
    position: relative;
    margin-bottom: 1.2rem;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    color: var(--col-white);
  }
  .trait h5.label {
    width: 100%;
    margin: 0;
    margin-bottom: 0.4rem;
    padding: 0;
    font-size: 1.2rem;
    line-height: 1.2rem;
    color: var(--col-info-800);
    text-align: center;
    font-family: Pixelar, sans-serif;
  }
  .trait .icon {
    font-size: 3rem;
    position: absolute;
    left: 0;
    top: 0;
    transform: scale(1) translate(-50%, 20%);
  }
  .trait p.value {
    width: 100%;
    box-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
    border-radius: 0px 5px 5px 0px;
    margin: 0;
    padding: 0 0.4rem 0 0.8rem;
    display: flex;
    justify-content: center;
    height: fit-content;
    background-color: #0089d7;
    text-align: center;
  }
  .trait p.name {
    background: #002cc7;
    border-radius: 2px;
    font-size: 1.2rem;
    padding: 0.4rem 0.8rem;
    text-align: center;
    font-family: Pixelar, sans-serif;
  }

  .row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.8rem;
    padding: 0 0.4rem 0 0.4rem;
  }

  .fade-container {
    border-left: 0.45rem solid var(--col-yellow-border);
    padding: 0.4rem 0 0 0.5rem;
    color: var(--col-white);
    text-align: left;
    white-space: nowrap;
  }

  .fade-container h5 {
    margin: 0;
    font-family: Pixelar, sans-serif;
    font-size: 1.2rem;
    line-height: 1.2;
  }
  .fade-container p {
    margin: 0;
    font-family: Pixelar, sans-serif;
    font-size: 1.6rem;
    line-height: 1.6;
  }

  @media (max-width: 1199px) {
    .fade-container p {
      text-align: center;
    }
  }

  .fade-container .label,
  .halloween .fade-container .label {
    color: var(--col-yellow-100);
    display: flex;
    align-items: center;
  }

  .fade-container .label .info {
    font-size: 1.6em;
    margin-right: 0.4rem;
    display: flex;
    align-items: center;
  }

  .fade-container.secondary,
  .halloween .fade-container.secondary {
    background: linear-gradient(to top, rgba(160, 101, 255, 0) 22.92%, rgba(160, 101, 255, 0.55) 100%);
    border-image: radial-gradient(50% 200% at 50% 99.92%, var(--col-purple-300) 0%, rgba(160, 101, 255, 0.4) 100%) 1;
  }
  .fade-container.secondary p,
  .halloween .fade-container.secondary p {
    color: var(--col-purple-400);
  }
  .fade-container.secondary .label,
  .halloween .fade-container.secondary .label {
    color: var(--col-white);
    word-break: break-all;
  }

  .alchemica-content {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    position: absolute;
    bottom: 0.4rem;
    left: 0.4rem;
    right: 0.4rem;
    height: 3.5rem;
    z-index: 20;
  }
  .carried-alchemica-content {
    margin: 0;
    padding: 0.25rem 1.5rem 0 1.5rem;
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    align-items: center;
    justify-content: center;
    align-content: center;
    justify-items: start;
    background-color: #006ef0;
    clip-path: polygon(0 0, calc(100% - 0.7rem) 0, 100% 50%, calc(100% - 0.7rem) 100%, 0 100%, 0 0);
  }
  .carried-alchemica-content.noclip {
    clip-path: none;
  }
  .alchemica {
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    gap: 0.3rem;
    height: 100%;
  }
  .alchemica-icon {
    width: 2.5rem;
    height: 2.5rem;
  }
  .alchemica-value {
    font-size: 2rem;
    line-height: 1;
    transform: translateY(-0.2rem);
  }
  .alchemica-value.fud {
    color: var(--col-text-fud);
  }
  .alchemica-value.fomo {
    color: var(--col-text-fomo);
  }
  .alchemica-value.alpha {
    color: var(--col-text-alpha);
  }
  .alchemica-value.kek {
    color: var(--col-text-kek);
  }

  .collected-alchemica {
    flex: 0 1 6.5rem;
    align-self: flex-end;
    justify-self: flex-end;
    text-align: right;
    background: #007df1;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 0.7rem 50%, 0 0);
    height: 100%;
    font-size: 1.4rem;
    line-height: 0.8;
    color: var(--col-info-200);
    padding-right: 0.5rem;
  }
  .collected-alchemica.align-center {
    align-self: center;
    justify-self: center;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
  .onchain-alchemica {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .collected-alchemica span {
    font-size: 2rem;
    line-height: 1;
    color: var(--col-white);
  }

  .description-container {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 0rem;
    flex: 0 1 auto;
    margin-top: 4rem;
  }

  .description {
    padding: 2rem;
  }

  .description p {
    font-size: 1.6rem;
    color: var(--col-white);
    line-height: 1.2;
    font-family: Pixelar, sans-serif;
  }

  .description p.info {
    margin-bottom: 1rem;
    color: var(--col-info-800);
  }
`;
