import css from 'styled-jsx/css';

export default css`
  .landing-screen {
    width: 100%;
    overflow-x: hidden;
    padding-top: 10rem; // Account for navigation
  }

  .main-container {
    padding: 20rem 4rem 0rem 4rem;
    max-width: 1400px;
  }

  .main-content {
    position: relative;
    padding-top: 50rem;
    transition: padding-top 1s;
    z-index: 0;
    overflow: hidden;
  }
  .main-content.short {
    padding-top: 15rem;
  }

  @media screen and (max-width: 1400px) {
    .heading {
      font-size: 16rem;
      line-height: 14rem;
    }
  }

  .components-container {
    display: flex;
    padding: 0rem 5rem;
    gap: 8rem;
    justify-content: space-evenly;
  }
  .join-event {
    position: relative;
    z-index: 2;
    flex: 1 0 calc(50% - 2.5rem);
  }
  .image-info-container {
    margin-top: 10rem;
  }
  .img-container {
    margin: 0 auto;
  }
  .starting-point {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    flex: 1 0 calc(50% - 2.5rem);
  }
  .blue-bg {
    background: linear-gradient(0deg, #110f86 -5.21%, #2586bc 71.44%);
    clip-path: polygon(0 0, 100% 20%, 100% 100%, 0 100%);
    padding-top: 170px;
  }
  .news {
    padding: 0 4rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  .social {
    padding-top: 8rem;
    padding-bottom: 5rem;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .effect-layer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -1;
  }

  .main-content:before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    top: 0;
    opacity: 0.4;
    z-index: -1;
  }

  .parallax-container {
    position: relative;
  }

  .parallax-layer {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: -1;
  }
  .footer-container {
    position: relative;
    z-index: 2;
  }

  .base-switch-notice {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6rem 2rem 5rem;
    background: #f4f6ff;
  }

  .base-switch-notice-text {
    margin: 0;
    font-family: Pixelar, sans-serif;
    font-size: 3.2rem;
    line-height: 1.15;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-align: center;
    color: #1a1464;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
  }

  @media screen and (max-width: 767px) {
    .base-switch-notice {
      padding: 4rem 1.5rem 3.5rem;
    }
    .base-switch-notice-text {
      font-size: 2.4rem;
    }
  }

  .cartridge-manage-section {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2.4rem;
    padding: 2rem 2rem 7rem;
    background: #f4f6ff;
  }

  .cartridge-manage-art {
    position: relative;
    width: min(42rem, 78vw);
    height: min(42rem, 78vw);
    filter: drop-shadow(0 12px 28px rgba(26, 20, 100, 0.28));
  }

  .cartridge-manage-text {
    margin: 0;
    max-width: 48rem;
    font-family: Pixelar, sans-serif;
    font-size: 2.8rem;
    line-height: 1.2;
    letter-spacing: 0.03em;
    text-align: center;
    text-transform: uppercase;
    color: #1a1464;
  }

  .cartridge-manage-link {
    color: #0057d9;
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }

  .cartridge-manage-link:hover {
    color: #c82ac2;
  }

  @media screen and (max-width: 767px) {
    .cartridge-manage-section {
      padding: 1rem 1.5rem 5rem;
      gap: 1.6rem;
    }
    .cartridge-manage-art {
      width: min(28rem, 82vw);
      height: min(28rem, 82vw);
    }
    .cartridge-manage-text {
      font-size: 2.2rem;
    }
  }

  .parallax-layer.main-bg {
    background: url(images/tex_star_field.png);
    background-repeat: repeat;
  }
  .leaderboard-button-container {
    margin: 2rem 0 7rem 12rem;
    width: calc(100% - 22rem);
  }
`;
