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

  .parallax-layer.main-bg {
    background: url(images/tex_star_field.png);
    background-repeat: repeat;
  }
  .leaderboard-button-container {
    margin: 2rem 0 7rem 12rem;
    width: calc(100% - 22rem);
  }
`;
