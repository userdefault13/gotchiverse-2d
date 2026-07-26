import css from 'styled-jsx/css';

export default css`
  .panel-button {
    border: none;
    padding: 0;
    position: relative;
    height: 6rem;
    min-width: 4.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 1.2rem;
    z-index: 1;
  }

  .panel-button.purple {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9) 75%, rgba(21, 21, 21, 0.9) 75%, rgba(21, 21, 21, 0.9));
    background-size: 100% 0.8rem;
    border-top: 0.3rem solid var(--col-purple-border);
    border-bottom: 0.3rem solid var(--col-purple-border);
    box-shadow: 0 0 0.8rem 0.2rem var(--col-purple-border);
  }
  .panel-button.info {
    background: linear-gradient(to bottom, var(--col-info-600), var(--col-info-600) 75%, var(--col-info-700) 75%, var(--col-info-700));
    background-size: 100% 0.8rem;
    border-top: 0.3rem solid var(--col-info-border);
    border-bottom: 0.3rem solid var(--col-info-border);
    box-shadow: 0 0 0.8rem 0.2rem var(--col-info-border);
  }
  .panel-button.guide {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0) 75%, rgba(241, 230, 242, 0.1) 75%, rgba(241, 230, 242, 0.1)),
      linear-gradient(90deg, rgba(0, 90, 109, 0.435) 19.89%, rgba(61, 5, 180, 0.6) 100.08%);
    background-size: 100%0.8rem;
    border-top: 0.3rem solid var(--col-info-300);
    border-bottom: 0.3rem solid var(--col-info-300);
    box-shadow: 0 0 0.8rem 0.2rem var(--col-info-300);
  }

  .cap {
    position: absolute;
    height: calc(100% - 0.8rem);
    top: 50%;
    width: 0.8rem;
    transform: translate(0, -50%);
    z-index: -1;
  }
  .purple .cap {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9) 75%, rgba(21, 21, 21, 0.9) 75%, rgba(21, 21, 21, 0.9));
    background-size: 100% 0.8rem;
    background-position-y: 0.1rem;
    border-top: 0.3rem solid var(--col-purple-border);
    border-bottom: 0.3rem solid var(--col-purple-border);
  }
  .info .cap {
    background: linear-gradient(to bottom, var(--col-info-600), var(--col-info-600) 75%, var(--col-info-700) 75%, var(--col-info-700));
    background-size: 100% 0.8rem;
    background-position-y: 0.1rem;
    border-top: 0.3rem solid var(--col-info-border);
    border-bottom: 0.3rem solid var(--col-info-border);
  }
  .guide .cap {
    border-top: 0.3rem solid var(--col-info-300);
    border-bottom: 0.3rem solid var(--col-info-300);
  }
  .cap.left {
    right: 100%;
  }
  .purple .cap.left {
    border-left: 0.3rem solid var(--col-purple-border);
  }
  .info .cap.left {
    border-left: 0.3rem solid var(--col-info-border);
  }
  .guide .cap.left {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0) 75%, rgba(241, 230, 242, 0.1) 75%, rgba(241, 230, 242, 0.1)),
      linear-gradient(90deg, rgba(0, 90, 109, 0.435) 19.89%, rgba(61, 5, 180, 0.6) 100.08%);
    border-left: 0.3rem solid var(--col-info-300);
    background-size: 100%0.8rem;
    background-position-y: 0.1rem;
  }
  .cap.right {
    left: 100%;
  }
  .purple .cap.right {
    border-right: 0.3rem solid var(--col-purple-border);
  }
  .info .cap.right {
    border-right: 0.3rem solid var(--col-info-border);
  }
  .guide .cap.right {
    background: linear-gradient(to bottom, rgb(35, 63, 188), rgb(35, 63, 188) 75%, rgb(57, 78, 195) 75%, rgb(57, 78, 195) 100.08%);
    border-right: 0.3rem solid var(--col-info-300);
    background-size: 100%0.8rem;
    background-position-y: 0.1rem;
  }
  .cap:after,
  .cap:before {
    content: '';
    position: absolute;
    width: 0.3rem;
    height: 0.8rem;
  }

  .purple .cap:after,
  .purple .cap:before {
    background-color: var(--col-purple-border);
  }
  .info .cap:after,
  .info .cap:before {
    background-color: var(--col-info-border);
  }

  .guide .cap:after,
  .guide .cap:before {
    background-color: var(--col-info-300);
  }

  .cap:after {
    top: 100%;
  }
  .cap:before {
    bottom: 100%;
  }

  .cap.left:after,
  .cap.left:before {
    left: 100%;
  }

  .cap.right:after,
  .cap.right:before {
    right: 100%;
  }
`;
