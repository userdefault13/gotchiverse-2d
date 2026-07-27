import css from 'styled-jsx/css';

export default css`
  button {
    margin: 0;
    padding: 0;
    position: relative;
    z-index: 0;
    border: 0.3rem solid var(--border-color, none);
    border-radius: 0.3rem;
    background-color: var(--bg-color, transparent);
    overflow: hidden;
    display: flex;
    text-align: left;
    line-height: 1em;
    display: flex;
    align-items: center;
    justify-content: var(--justify-content, center);
    box-shadow: var(--box-shadow, none);
    height: 100%;
  }
  .img-container {
    position: relative;
    width: var(--icon-width);
    height: var(--icon-height);
    z-index: 1;
    overflow: hidden;
    flex: 1 0 auto;
  }

  .label {
    display: inline-block;
    color: var(--color, var(--col-info-400));
    font-family: Pixelar, sans-serif;
    font-size: 1rem;
    line-height: 1;
    max-width: 5.5rem;
  }
  @media (max-width: 1126px) {
    .label {
      font-size: 0.95rem;
    }
  }
`;
