import css from 'styled-jsx/css';

export default css`
  .loading-box {
    position: absolute;
    top: 3.6rem;
    padding: 0.8rem;
    left: 50%;
    transform: translate(-50%);
    background-color: rgba(0, 0, 0, 0.7);
    border-radius: 0.5rem;
    z-index: 10;
    width: 12rem;
    height: 4.2rem;
    filter: blur(0.3rem);
  }
  .loading-content {
    position: absolute;
    top: 3.6rem;
    padding: 0.8rem;
    left: 50%;
    transform: translate(-50%);

    display: flex;
    align-items: center;
    gap: 0.8rem;
    width: 12rem;
    z-index: 11;
  }
  .loading-content p {
    color: var(--col-info-400);
    margin: 0 0.8rem 0 0;
    font-size: 2.6rem;
    line-height: 2.6rem;
  }

  .scrollable {
    margin-top: 2.4rem;
    height: 48rem;
  }
  // .halloween.scrollable::-webkit-scrollbar-thumb {
  //   background: var(--col-halloween-400);
  //   box-shadow: 0 0 0.8rem 0.1rem var(--col-halloween-border);
  // }
  .filter-container {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;

    width: 100%;
    height: 4.8rem;
    margin-bottom: 1.6rem;
  }

  .search-input {
    width: 31.6rem;
    margin-left: 0.6rem;
  }

  .filter-options {
    display: flex;
    flex-direction: row;
    gap: 1.2rem;
    align-items: center;
  }
  .content {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-column-gap: 5rem;
    grid-row-gap: 1.2rem;
  }

  .empty-recipes {
    grid-column: 1 / -1;
    text-align: center;
    padding: 4rem 1rem;
    font-size: 2.4rem;
    color: var(--col-pink-200);
    opacity: 0.85;
  }
`;
