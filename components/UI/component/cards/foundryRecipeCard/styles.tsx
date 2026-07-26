import css from 'styled-jsx/css';

export default css`
  .card-container {
    border: 0.2rem solid var(--col-cyan-400, #50dce6);
    border-radius: 0.4rem;
    position: relative;
    user-select: none;
    box-shadow: 0 0 0.4rem 0.2rem rgba(80, 220, 230, 0.45), 0.4rem 0.4rem 0.4rem rgba(20, 40, 56, 0.35) inset;
    height: 21.6rem;
  }

  .img-container {
    background: radial-gradient(circle at center, rgba(80, 220, 230, 0.12), rgba(0, 0, 0, 0.85));
    height: 100%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.2rem;
  }

  .name-container {
    position: absolute;
    background-color: rgba(0, 0, 0, 0.78);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    bottom: 0;
    height: 4.4rem;
    padding: 0 0.8rem;
    border-top: 0.2rem solid rgba(80, 220, 230, 0.35);
  }

  .name-container p {
    text-align: center;
    color: #9ef0f6;
    text-transform: uppercase;
    font-size: 2.2rem;
    line-height: 2rem;
    margin-bottom: 0.4rem;
  }

  .recipe {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2.4rem;
    cursor: url('/cursors/pointer.png'), pointer;
    padding: 0.8rem;
    transition: 100ms ease;
  }

  .recipe:hover {
    filter: drop-shadow(0 0 0.4rem rgba(80, 220, 230, 0.65));
    transform: scale(1.01);
  }

  .recipe:nth-child(2n) {
    padding-left: 3.2rem;
  }

  .ingredients-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.8rem;
  }

  .section-label {
    color: rgba(200, 220, 230, 0.75);
    font-size: 1.6rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0;
  }

  .ingredient {
    display: flex;
    align-items: center;
  }

  .ingredient img {
    width: 3.2rem;
    height: 3.2rem;
    object-fit: contain;
  }

  .ingredient p {
    margin: 0 0 0 1.2rem;
    color: var(--col-white);
    font-size: 2.4rem;
    line-height: 1;
  }

  .craft-hint {
    margin-top: 0.6rem;
    color: rgba(240, 192, 80, 0.9);
    font-size: 1.6rem;
  }

  .tier {
    color: #50dce6;
    font-size: 1.6rem;
    text-transform: uppercase;
  }
`;
