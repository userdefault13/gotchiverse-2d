import css from 'styled-jsx/css';

export default css`
  .card-container {
    border: 0.2rem solid var(--col-pink-400);
    border-radius: 0.4rem;
    position: relative;
    user-select: none;
    box-shadow: 0 0 0.4rem 0.2rem var(--col-pink-400), 0.4rem 0.4rem 0.4rem rgba(122, 21, 118, 0.25) inset;
    height: 21.6rem;
  }
  .recipe.limited-edition .card-container {
    border-color: var(--col-legendary-400);
    box-shadow: 0 0 0.4rem 0.2rem var(--col-legendary-400), 0.4rem 0.4rem 0.4rem rgba(122, 21, 118, 0.25) inset;
  }

  .img-container {
    background-color: var(--col-dark-grey);
    height: 100%;
    overflow: hidden;
  }
  .img-container img {
    object-fit: contain;
    width: 100%;
    height: 100%;
  }

  .end-time {
    position: absolute;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    top: 0;
    height: 2.6rem;
    border-bottom: 0.2rem solid var(--col-legendary-400);
  }
  .end-time p {
    margin: 0 0 0 0.6rem;
    color: var(--col-legendary-400);
    font-size: 1.8rem;
  }

  .name-container {
    position: absolute;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    bottom: 0;
    height: 4.4rem;
    padding: 0 0.8rem;
  }
  .name-container p {
    text-align: center;
    color: var(--col-pink-300);
    text-transform: uppercase;
    font-size: 2.4rem;
    line-height: 1.1;
    margin-bottom: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .recipe.limited-edition .name-container p {
    color: var(--col-legendary-400);
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
    filter: drop-shadow(0 0 0.4rem var(--col-pink-400));
    transform: scale(1.01);
  }
  .recipe:hover {
    filter: drop-shadow(0 0 0.4rem var(--col-halloween-400));
    transform: scale(1.01);
  }
  .recipe.limited-edition:hover {
    filter: drop-shadow(0 0 0.4rem var(--col-legendary-400));
  }

  .recipe:nth-child(2n) {
    padding-left: 3.2rem;
  }

  .ingredients-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .ingredient {
    display: flex;
    align-items: center;
  }
  .ingredient img {
    width: 3.2rem;
  }
  .ingredient p {
    margin: 0 0 0 1.2rem;
    color: var(--col-white);
    font-size: 2.8rem;
    line-height: 1;
  }

  /************************************/
  /********* Halloween Style **********/
  /************************************/

  .halloween .card-container {
    border: 0.2rem solid var(--col-halloween-400);
    box-shadow: 0 0 0.4rem 0.2rem var(--col-halloween-400), 0.4rem 0.4rem 0.4rem rgba(122, 21, 118, 0.25) inset;
  }

  .halloween .name-container p {
    color: var(--col-halloween-300);
  }
`;
