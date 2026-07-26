import css from 'styled-jsx/css';

export default css`
  .balances-container,   
  .balances-container.pink {
    background: linear-gradient(180deg, rgba(200, 42, 194, 0) 0%, rgba(200, 42, 194, 0.45) 93.23%);
    border-bottom: 3px solid;
    border-image: radial-gradient(50% 100% at 50% 99.92%, #c82ac2 0%, rgba(200, 42, 194, 0.4) 100%) 1;
    padding: 0.2rem 0.4rem 0 0.6rem;
  }

  .balances-container.white {
    background: linear-gradient(180deg, rgba(105, 105, 105, 0) 0%, rgba(143, 118, 142, 0.45) 93.23%);
    border-bottom: 3px solid;
    border-image: radial-gradient(50% 100% at 50% 99.92%, #ffffff 0%, rgba(185, 185, 185, 0.4) 100%) 1;
  }

  .title-container {
    width: 100%;
    text-align: center;
    font-weight: 400;
    font-size: 3.4rem;
    line-height: 1;
    text-transform: uppercase;
  }
  .title-container .pink {
    color: var(--col-pink-200);
  }
  .title-container .white {
    color: var(--col-white);
  }
  .balance-list {
    padding: 0.4rem 1rem 0.4rem 0.4rem;
  }
  .alchemica {
    display: flex;
    flex-direction: row;
    gap: 0.6rem;
    align-items: center;
    margin-top: 1.4rem;
    width: 13.2rem;
  }
  .alchemica .image {
    position: relative;
    width: 6.4rem;
    height: 6.4rem;
    flex: 0 0 auto;
  }
  .alchemica .text {
    text-align: left;
    margin: 0;
    font-size: 2.6rem;
  }

  /*********************************/
  /******* Halloween Style *********/
  /*********************************/

  .balances-container.halloween {
    background: linear-gradient(180deg, rgba(231, 94, 17, 0) 0%, rgba(231, 94, 17, 0.45) 93.23%);
    border-image: radial-gradient(50% 100% at 50% 99.92%, var(--col-halloween-400) 0%, rgba(231, 94, 17, 0.4) 100%) 1;
  }

  .title-container .halloween {
    color: var(--col-halloween-200);
  }

`;
