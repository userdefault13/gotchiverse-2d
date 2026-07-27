import css from 'styled-jsx/css';

export default css`
  .enter-button {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 9.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(0, #0030dc 0%, #4478fd 100%);
    border-radius: 0.4rem;
    overflow: hidden;
    padding: 0.5rem;
    border: none;
  }
  .enter-button-inner {
    background: #3d0980;
    padding: 0.5rem;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    border-radius: 0.4rem;
  }
  .enter-button-inner:before,
  .enter-button-inner:after {
    content: '';
    position: absolute;
  }
  .enter-button-inner:before {
    right: 1rem;
    top: 1rem;
    bottom: 1rem;
    width: 0.5rem;
    background: #5f2ec8;
  }
  .enter-button-inner:after {
    right: 1rem;
    left: 1rem;
    bottom: 1rem;
    height: 0.5rem;
    background: #5f2ec8;
  }
  .enter-button-text {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: #8348ff;
  }

  .enter-button-text:before {
    content: '';
    position: absolute;
    left: 1rem;
    top: 1rem;
    right: 1rem;
    height: 0.5rem;
    background: #9b6cff;
  }
  .enter-button-text span {
    font-size: 3.6rem;
    line-height: 1;
    font-family: Pixelar, sans-serif;
    color: var(--col-white);
    text-transform: uppercase;
    transform: translateY(0.2rem);
  }
`;
