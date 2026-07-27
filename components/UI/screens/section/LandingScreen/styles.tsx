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

  .cartridge-promo-bg {
    position: relative;
    z-index: 2;
    background: linear-gradient(0deg, #110f86 -5.21%, #2586bc 71.44%);
    padding: 8rem 0 7rem;
  }

  .cartridge-promo {
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 5rem 6rem;
    margin-left: auto;
    margin-right: auto;
  }

  .cartridge-promo-copy {
    flex: 0 1 42rem;
    max-width: 42rem;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 2rem;
    color: #fff;
  }

  .cartridge-promo-title {
    margin: 0;
    font-family: Pixelar, sans-serif;
    font-size: 5.2rem;
    line-height: 0.95;
    text-transform: uppercase;
    color: #fff;
    text-shadow: 0 0 20px rgba(17, 0, 38, 0.5);
    border-top: 0.4rem solid #fff;
    padding-top: 1.4rem;
  }

  .cartridge-promo-caption {
    margin: 0;
    font-family: Pixelar, sans-serif;
    font-size: 2.4rem;
    line-height: 1.25;
    color: rgba(255, 255, 255, 0.92);
    max-width: 42rem;
  }

  .cartridge-promo-art-wrap {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 0;
  }

  .cartridge-promo-art {
    position: relative;
    width: min(38rem, 70vw);
    height: min(38rem, 70vw);
    filter: drop-shadow(0 14px 30px rgba(0, 0, 0, 0.45));
  }

  @media screen and (max-width: 1023px) {
    .cartridge-promo {
      flex-direction: column-reverse;
      gap: 3rem;
    }
    .cartridge-promo-copy {
      max-width: 100%;
      align-items: center;
      text-align: center;
    }
    .cartridge-promo-title {
      font-size: 4rem;
      width: 100%;
    }
    .cartridge-promo-caption {
      font-size: 2.1rem;
    }
  }

  @media screen and (max-width: 767px) {
    .cartridge-promo-bg {
      padding: 5rem 0 5rem;
    }
    .cartridge-promo-title {
      font-size: 3.2rem;
    }
    .cartridge-promo-art {
      width: min(28rem, 82vw);
      height: min(28rem, 82vw);
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
