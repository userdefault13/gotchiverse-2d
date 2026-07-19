import css from 'styled-jsx/css';

export default css`
  .inner {
    padding: 4rem 1.6rem;
  }
  .main {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 4.8rem;
  }
  .params-status {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
    min-width: 20rem;
  }
  .collected-info {
    display: flex;
    flex-direction: column;
    gap: 3.2rem;
    min-widht: 30rem;
  }
  .card-container {
    margin-top: 1.6rem;
  }
  .button-container {
    width: 24rem;
    margin: 1.6rem auto;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  .hint {
    margin-top: 0.8rem;
    opacity: 0.7;
    font-size: 1.2rem;
  }
  .col {
    min-width: 24rem;
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
  }
`;

