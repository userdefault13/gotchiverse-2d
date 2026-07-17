import css from 'styled-jsx/css';

export default css`
  .cta-baazaar .gradient {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
  }
  .cta-baazaar .gradient:after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: calc(-1 * var(--grad-height));
    height: var(--grad-height);
    background: linear-gradient(180deg, rgba(0, 88, 220, 0) 0%, rgba(0, 88, 220, 0.3) 60%, rgba(0, 88, 220, 0.6) 100%);
    z-index: 2;
    pointer-events: none;
    z-index: -1;
  }

  .cta-baazaar .gradient:before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: rgba(0, 88, 220, 0.6);
    z-index: 1;
    clip-path: var(--clip-path);
    pointer-events: none;
  }

  .buy-cta-card {
    position: relative;
    max-width: 44rem;
    height: 13.25rem;
    padding: 1.6rem 0.8rem;
    padding-left: 10rem;
    margin-top: 0;
    display: flex;
    align-items: center;
    background: var(--bg-color);
    border: 0.4rem solid var(--border-color);
    border-radius: 0.4em;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin: 0 auto;
    transform: translateY(0);
    z-index: 20;
  }

  .img-container {
    position: absolute;
  }
  .img-container.card-baazaar {
    left: 0;
    bottom: 2.25rem;
    transform: translate(-5rem, 2.9rem);
    width: 16.5rem;
    height: 18rem;
  }
  .img-container.card-lending {
    left: 0;
    bottom: 0.35rem;
    transform: translate(-2rem, -0.35rem);
    width: 14rem;
    height: 11rem;
    border-radius: 0.4em;
    border: 0.4rem solid var(--border-color);
    overflow: hidden;
  }

  .detail-wrapper {
    padding-left: 4.5rem;
  }

  h1 {
    font-family: Pixelar;
    font-style: normal;
    font-weight: 700;
    font-size: 1.8rem;
    line-height: 1.1em;
    text-transform: uppercase;
    color: var(--title-color);
    margin: 0;
    white-space: nowrap;
  }

  p {
    font-family: Pixelar;
    font-style: normal;
    font-weight: 400;
    font-size: 1.8rem;
    line-height: 2rem;
    display: flex;
    align-items: center;

    color: #ffffff;
  }

  .cta-button-wrapper {
    position: absolute;
    right: 35%;
    bottom: -35%;
    transform: translateX(50%);
    overflow: hidden;
    margin: 0.4rem;
    border-radius: 0.2em;
    border: 0.4rem solid var(--border-color);
  }

  @media (max-width: 1199px) {
    .buy-cta-card {
      padding: 2rem;
      text-align: center;
      max-width: calc(100% - 1rem);
      height: 13.25rem;
    }
    .img-container {
      display: none;
    }
    .detail-wrapper {
      padding-left: 0;
    }
    .cta-button-wrapper {
      transform: translateX(3.5rem);
      margin: 0 auto;
    }
  }
`;
