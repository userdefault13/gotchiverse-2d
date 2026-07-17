import css from 'styled-jsx/css';

export default css`
  .header-section {
    display: flex;
    width: 100%;
    height: 7rem;
    align-items: flex-end;
  }
  .heading {
    font-family: Pixelar;
    font-size: 5.8rem;
    line-height: 5rem;
    text-transform: uppercase;
    text-shadow: 0px 0px 20px rgba(17, 0, 38, 0.5);
    color: var(--col-white);
    border-top: 0.4rem solid var(--col-white);
    padding-top: 1.6rem;
    padding-right: 2rem;
    white-space: nowrap;
  }
  .diag-line-wrapper {
    width: 7rem;
    height: 7rem;
    margin-left: -0.2rem;
  }
  .diag-line-wrapper .diag-line {
    width: 9.5rem;
    border-bottom: 0.4rem solid var(--col-white);
    transform: rotate(45deg);
    transform-origin: left;
  }
  .header-section .bottom-line {
    border-bottom: 0.4rem solid var(--col-white);
    margin-left: -0.4rem;
    flex-grow: 1;
    position: relative;
  }
  .header-section .bottom-line:after {
    display: block;
    position: absolute;
    bottom: -0.9rem;
    right: 0;
    content: '';
    width: 1.4rem;
    height: 1.4rem;
    background: var(--col-white);
  }

  .line {
    background: var(--col-yellow-border);
    height: 3px;
    left: 0;
    width: 100%;
  }

  .line-container {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .title-section {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
  }
  .title-section .outline-left,
  .title-section .outline-right {
    flex-grow: 1;
    display: flex;
    height: 2em;
  }
  .bottom-line {
    border-bottom: 0.4rem solid var(--col-pink-border);
    width: 100%;
    flex-grow: 1;
    position: relative;
  }
  .title-section.yellow .bottom-line {
    border-bottom: 0.4rem solid var(--col-yellow-border);
  }
  .title-section .top-line {
    border-top: 0.4rem solid var(--col-pink-border);
    width: 5em;
  }
  .title-section.yellow .top-line {
    border-top: 0.4rem solid var(--col-yellow-border);
  }
  .outline-left .bottom-line:before,
  .outline-right .bottom-line:after {
    position: absolute;
    bottom: -0.9rem;
    content: '';
    width: 0.8em;
    height: 0.8em;
    background: var(--col-pink-400);
  }
  .title-section.yellow .outline-left .bottom-line:before,
  .title-section.yellow .outline-right .bottom-line:after {
    background: var(--col-yellow-100);
  }
  .title-section .outline-left .bottom-line:before {
    left: 0;
  }
  .title-section .outline-right .bottom-line:after {
    right: 0;
  }
  .diag,
  .anti-diag {
    width: 2em;
  }
  .diag {
    background: linear-gradient(
      to bottom right,
      transparent calc(50% - 2px),
      var(--col-pink-border) calc(50% - 2px),
      var(--col-pink-border) calc(50% + 2px),
      transparent calc(50% + 2px)
    );
  }
  .yellow .diag {
    background: linear-gradient(
      to bottom right,
      transparent calc(50% - 2px),
      var(--col-yellow-border) calc(50% - 2px),
      var(--col-yellow-border) calc(50% + 2px),
      transparent calc(50% + 2px)
    );
  }
  .anti-diag {
    background: linear-gradient(
      to bottom left,
      transparent calc(50% - 2px),
      var(--col-pink-border) calc(50% - 2px),
      var(--col-pink-border) calc(50% + 2px),
      transparent calc(50% + 2px)
    );
  }
  .yellow .anti-diag {
    background: linear-gradient(
      to bottom left,
      transparent calc(50% - 2px),
      var(--col-yellow-border) calc(50% - 2px),
      var(--col-yellow-border) calc(50% + 2px),
      transparent calc(50% + 2px)
    );
  }
  .title {
    font-family: Pixelar;
    font-size: 2.8em;
    line-height: 0.85em;
    color: var(--col-pink-300);
    text-transform: uppercase;
    text-align: center;
    flex: 1 0 auto;
  }
  .title.yellow {
    color: var(--col-yellow-100);
  }
  .title.info {
    color: var(--col-info-400);
  }

  .title-container-right {
    position: relative;
    padding-bottom: 0.5rem;
    position: relative;
  }

  .title-container-right:after {
    content: '';
    position: absolute;
    background: linear-gradient(to bottom, rgba(255, 214, 0, 0.5) -18.54%, rgba(212, 166, 0, 0.21) 57.4%, rgba(212, 166, 0, 0.025) 90.12%),
      linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0) 100%);
    opacity: 0.7;
    left: 0;
    right: 0;
    bottom: 0;
    top: calc(100% - 11rem);
    transform: matrix(1, 0, 0, -1, 0, 0);
  }

  .styled-line {
    display: flex;
    flex: 1;
    width: calc(100% - 10em);
    height: calc(100% - 4em);
    position: absolute;
    top: 3rem;
  }

  .styled-line .bottom-line {
    border-bottom: 0.4rem solid var(--col-yellow-border);
    width: 45%;
    height: 100%;
    position: relative;
  }
  .styled-line .bottom-line:before {
    display: block;
    position: absolute;
    bottom: -0.9rem;
    content: '';
    width: 1.4rem;
    height: 1.4rem;
    background: var(--col-yellow-border);
  }

  .styled-line .diag-line {
    width: 3rem;
    background: linear-gradient(
      to bottom right,
      transparent calc(50% - 2px),
      var(--col-yellow-100) calc(50% - 2px),
      var(--col-yellow-100) calc(50% + 2px),
      transparent calc(50% + 2px)
    );
  }

  .styled-line .top-line {
    width: 45%;
    height: 100%;
    border-top: 0.4rem solid var(--col-yellow-border);
  }

  .title-right {
    color: var(--col-yellow-100);
    font-family: Pixelar;
    font-size: 2.5em;
    line-hight: 0.7;
    text-transform: uppercase;
    text-align: right;
    max-width: 70%;
    margin-left: auto;
    text-shadow: 0px 0px 20px rgba(17, 0, 38, 0.5);
  }

  .simple-right-line {
    display: flex;
    align-items: center;
  }
  .simple-right-line .title {
    font-size: 3em;
    line-height: 1;
    font-family: Pixelar;
    color: var(--col-info-400);
    text-shadow: 0px 0px 20px rgba(17, 0, 38, 0.5);
  }

  .simple-right-line .mid-line {
    height: 0rem;
    border-bottom: 0.4rem solid var(--col-blue-border);
    margin-bottom: 1rem;
    flex-grow: 1;
    position: relative;
  }
  .simple-right-line .mid-line:after {
    position: absolute;
    right: 0;
    bottom: -0.9rem;
    content: '';
    width: 1.4rem;
    height: 1.4rem;
    background: var(--col-info-400);
  }
  .bottom-line-two-side {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.5em;
  }

  .bottom-line-two-side .left-bottom-line,
  .bottom-line-two-side .right-bottom-line {
    position: relative;
    flex: 0 1 12%;
    max-width: 12%;
    height: 0.5rem;
    background: var(--col-info-800);
    margin-bottom: 1rem;
  }
  .bottom-line-two-side .left-bottom-line {
    margin-right: 1rem;
  }
  .bottom-line-two-side .right-bottom-line {
    margin-left: 1rem;
  }
  .bottom-line-two-side .right-bottom-line:after,
  .bottom-line-two-side .left-bottom-line:before {
    position: absolute;
    bottom: -0.5rem;
    content: '';
    width: 1.4rem;
    height: 1.4rem;
    background: var(--col-info-border);
  }
  .bottom-line-two-side .right-bottom-line:after {
    right: 0;
  }

  @media screen and (max-width: 1199px) {
    .title-section .title {
      font-size: 2.5em;
    }
    .bottom-line-two-side .title {
      font-size: 2.5em;
    }
    .heading {
      font-size: 5rem;
    }
  }
  @media screen and (max-width: 1023px) {
    .title-section .title {
      font-size: 3.5em;
    }
    .bottom-line-two-side .title {
      font-size: 3.5em;
    }
    .heading {
      font-size: 5rem;
    }
  }
  @media screen and (max-width: 767px) {
    .title-section .title {
      font-size: 2em;
    }
    .bottom-line-two-side .title {
      font-size: 2em;
    }
    .heading {
      font-size: 5rem;
    }
  }
`;
