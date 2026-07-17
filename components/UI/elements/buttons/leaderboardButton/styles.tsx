import css from 'styled-jsx/css';

export default css`
  .leaderboard-btn-container {
    position: relative;
    height: 7rem;
  }
  .trophy-icon-container {
    position: absolute;
    top: -0.5rem;
    left: -3rem;
    height: 8rem;
    width: 8rem;
    z-index: 1;
  }
  .trophy-icon {
    width: 100%;
    height: 100%;
    position: relative;
  }
  .cta-container {
    position: relative;
    width: 100%;
    height: 100%;
    background: var(--col-yellow-100);
    clip-path: polygon(0% 0%, 100% 0%, calc(100% - 3rem) 50%, 100% 100%, 0% 100%);
  }
  .cta-inner {
    position: absolute;
    left: 5px;
    right: 5px;
    top: 2px;
    bottom: 2px;
    background: #362389;
    clip-path: polygon(0% 0%, 100% 0%, calc(100% - 2.8rem) 50%, 100% 100%, 0% 100%);
  }
  .btn-container {
    position: absolute;
    left: 0.5rem;
    right: 1rem;
    top: 0.4rem;
    bottom: 0.4rem;
    background: var(--col-yellow-100);
    clip-path: polygon(0% 0%, 100% 0%, calc(100% - 2.5rem) 50%, 100% 100%, 0% 100%);
  }
  .btn-inner {
    position: absolute;
    left: 0.5rem;
    right: 0.8rem;
    top: 0.3rem;
    bottom: 0.3rem;
    background: linear-gradient(to right, rgba(0, 112, 243, 0.32) 18.13%, rgba(79, 20, 248, 0.4) 96.01%, rgba(79, 20, 248, 0) 117.01%),
      linear-gradient(180deg, rgba(0, 62, 182, 0.8) 18.13%, #3400ca 96.01%, rgba(79, 20, 248, 0) 117.01%);
    clip-path: polygon(0% 0%, 100% 0%, calc(100% - 2.2rem) 50%, 100% 100%, 0% 100%);
    font-family: Pixelar;
    font-size: 2.5rem;
    line-height: 1;
    padding-top: 1.5rem;
    text-transform: uppercase;
    color: var(--col-yellow-100);
    text-align: center;
  }
  @media screen and (max-width: 1199px) {
    .btn-inner {
      font-size: 2.2rem;
      line-height: 2.5rem;
    }
  }
`;
