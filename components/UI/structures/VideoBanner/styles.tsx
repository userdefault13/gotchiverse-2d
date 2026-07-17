import css from 'styled-jsx/css';

export default css`
  .banner-container {
    position: absolute;
    overflow: hidden;
    z-index: 10;
    width: 100%;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 100%, 0 100%);
    transition: all 1s;
  }

  .banner-container.short {
    clip-path: polygon(0 0, 100% 0, 100% 40%, 50% 100%, 0 40%);
  }

  .banner-contents {
    max-width: 80%;
    margin: 0 auto;
    padding: 12rem 0;
    transition: all 1s;
  }

  .short .banner-contents {
    padding: 5rem 0;
  }

  .version-container {
    font-size: 3.2rem;
    line-height: 0.5;
    color: var(--col-white);
    margin-top: 2rem;
    text-align: center;
  }

  .close-toggle-container {
    position: absolute;
    right: 2rem;
    top: 0;
  }

  .close-toggle {
    display: block;
    font-size: 10rem;
    line-height: 1;
    color: white;
    background: none;
    border: none;
  }

  .banner-video-wrapper {
    z-index: -1;
  }

  .video-player {
    object-fit: fill;
    position: absolute;
    width: 100%;
    top: 50%;
    transform: translateY(-50%);
  }

  .main-title-wrapper {
    text-transform: uppercase;
    font-family: Pixelar;
    -webkit-text-stroke: 1px solid var(--col-black);
    text-shadow: 0px 0px 2rem rgba(0, 0, 0, 0.6), 0px 0px 2.4rem #110026;
    text-align: center;
    margin-bottom: 8rem;
    line-height: 1;
  }

  .short .main-title-wrapper {
    margin-bottom: 0;
  }

  .main-title {
    color: var(--col-info-800);
    font-size: 4.8rem;
  }

  .main-subtitle {
    color: var(--col-white);
    font-size: 8.4rem;
  }

  .button-list {
    max-width: 68rem;
    margin: 0 auto;
    overflow: hidden;
    transition: all 1s;
    height: 8rem;
    opacity: 1;
  }
  .short .button-list {
    height: 0rem;
    opacity: 0;
  }

  @media screen and (max-width: 991px) {
    .main-title {
      font-size: 3.8rem;
    }

    .main-subtitle {
      font-size: 6.8rem;
    }
  }
`;
