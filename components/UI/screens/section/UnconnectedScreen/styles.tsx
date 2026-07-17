import css from 'styled-jsx/css';

export default css`
  .container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .main {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }
  .title-container {
    width: 100%;
    max-width: 74rem;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .title {
    width: 100%;
    object-fit: contain;
  }

  .title > img {
    z-index: 10;
  }

  .version {
    color: white;
    text-align: center;
    font-size: 3.6rem;
    margin-bottom: 1.8rem;
  }

  .login {
    margin-bottom: 64px;
    display: flex;
    flex-direction: row;
    gap: 8px;
    cursor: url('/cursors/pointer.png'), pointer;
  }
  .login .icon {
    margin-top: auto;
    margin-bottom: auto;
  }
  .login > span {
    font-size: 36px;
    line-height: 40px;
    color: var(--col-info-400);
  }

  /************************************/
  /********* Halloween Style **********/
  /************************************/

  h2.halloween {
    color: var(--col-halloween-200);
    font-size: 6.8rem;
    padding-left: 8rem;
    margin-top: -3.5rem;
    margin-bottom: 6rem;
    text-align: center;
    text-transform: uppercase;
    filter: drop-shadow(0 0 1px var(--col-halloween-400)) drop-shadow(0 0 1px var(--col-halloween-400));
    z-index: 10;
  }

  .button-container.halloween {
    padding-left: 5.2rem;
  }

  .connect-to-base {
    width: 32rem;
  }
`;
