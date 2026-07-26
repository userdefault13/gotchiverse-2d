import css from 'styled-jsx/css';

export default css`
  div {
    width: 100%;
  }
  .status-container {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .title-container {
    width: 100%;
    text-align: center;
    font-size: 3.2rem;
    color: var(--color-white);
    text-transform: uppercase;
  }
  .alchemica-container {
    background: linear-gradient(180deg, rgba(200, 42, 194, 0) -15.34%, rgba(200, 42, 194, 0.45) 100%);
    padding: 0.6rem 0 0.2rem;
    margin: 0.2rem 0 0.4rem;
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    border-bottom: 1px solid;
    border-image: radial-gradient(50% 2354449.91% at 50% 99.92%, var(--col-pink-400) 0%, rgba(200, 42, 194, 0.4) 100%) 1;
  }
  .icon-container {
    position: relative;
    padding: 0;
    width: 6.4rem;
    height: 6.4rem;
  }
  .balances-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .status-row {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    width: 100%;
  }
  .status-row .label {
    font-size: 2.4rem;
    line-height: 1;
    color: var(--col-white);
    opacity: 0.6;
  }
  .balances {
    display: flex;
    flex-direction: row;
    justify-content: space-evenly;
    font-size: 2.4rem;
    line-height: 1;
  }
  .balances > * {
    flex: 1 0 0;
    text-align: center;
  }
  .fud {
    color: #52bb34;
  }
  .fomo {
    color: #df2b25;
  }
  .alpha {
    color: #3bccff;
  }
  .kek {
    color: #f934f3;
  }

  /******************************/
  /****** Halloween Style *******/
  /******************************/

  .halloween .alchemica-container {
    background: linear-gradient(180deg, rgba(231, 94, 17, 0) -15.34%, rgba(231, 94, 17, 0.45) 100%);
    border-image: radial-gradient(50% 2354449.91% at 50% 99.92%, var(--col-halloween-400) 0%, rgba(231, 94, 17, 0.4) 100%) 1;
  }
`;
