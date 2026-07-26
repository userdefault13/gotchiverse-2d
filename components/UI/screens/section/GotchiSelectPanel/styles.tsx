import css from 'styled-jsx/css';

export default css`
  .details-container {
    position: relative;
  }
  .select-panel-title {
    font-family: 'Kimberley Bl';
    font-size: 4.6rem;
    text-transform: uppercase;
    background: -webkit-linear-gradient(#ffa24d, #ffe600);
    filter: drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.6));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    white-space: nowrap;
  }

  .select-panel-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 32rem;
    position: relative;
  }

  .filter-section {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    justify-content: space-between;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    height: 3.5rem;
  }
  @media (max-width: 1023px) {
    .select-panel-title {
      font-size: 2.8rem;
    }
    .filter-section {
      margin-top: 0.5rem;
    }
  }
  @media (max-width: 1199px) {
    .select-panel-title {
      font-size: 3.6rem;
    }
    .filter-section {
      margin-top: 1rem;
    }
  }

  .filter-option {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    align-items: center;
    justify-content: end;
  }

  .filter-option.channel-toggle {
    min-width: 7rem;
  }

  .results-container {
    padding: 1.2rem 0;
    height: 4.8rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .results-container p {
    margin: 0;
    padding: 0;
  }

  .gotchi-list-container {
    position: relative;
    margin: 1rem auto;
    width: 100%;
    height: 100%;
  }
  .gotchi-list-container.shade:after {
    position: absolute;
    content: '';
    left: 0;
    right: 0;
    bottom: 0;
    height: 4rem;
    background: linear-gradient(180deg, rgba(34, 9, 89, 0) 0%, rgba(11, 21, 109, 0.74) 50%, rgba(17, 3, 99, 0.95) 100%);
    z-index: 1;
  }

  .gotchi-list-inner {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 2.5rem;
    align-content: start;
    justify-content: center;
    align-items: stretch;
    padding: 1rem 0.75rem 4rem 0.75rem;
    width: 100%;
    height: fit-content;
    max-height: calc(100vh - 40rem);
  }

  .gotchi-card {
    width: 100%;
    min-height: 13rem;
  }

  .empty-state {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
  }
  .empty-state .empty-comment {
    color: white;
    font-size: 2.4rem;
    line-height: 2.4rem;
    margin-bottom: 1.2rem;
    text-transform: uppercase;
    text-align: center;
    width: 80%;
  }
  .empty-state > a {
    color: #f543ef;
    font-size: 2.4rem;
  }
  .empty-state > h4 {
    text-transform: uppercase;
    font-size: 2.4rem;
    line-height: 2.4rem;
  }
  .empty-state > p {
    text-align: center;
    font-size: 2rem;
    line-height: 2rem;
    color: var(--col-pink-200);
    width: 100%;
  }
  .empty-state .gotchi-img {
    margin-top: 1.6rem;
    width: 6rem;
    height: 6.5rem;
  }

  .empty-state .baazaar-img {
    position: relative;
    width: 14rem;
    height: 14rem;
  }
  .baazaar-link-container {
    padding-top: 0.8rem;
  }
  .baazaar-link-container .baazaar-img {
    border: 2px solid var(--col-pink-400);
    border-bottom: none;
    border-top-left-radius: 0.8rem;
    border-top-right-radius: 0.8rem;
    margin-bottom: -4px;
    margin-left: 4px;
    box-shadow: 0 0 4px 2px var(--col-pink-400);
    width: 20rem;
    height: 20rem;
    padding: 2rem;
  }

  .join-observoor {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding-top: 1.6rem;
  }

  .join-observoor > span {
    font-size: 3rem;
    line-height: 3rem;
    color: var(--col-white);
    margin-bottom: 0.4rem;
  }

  .nakey-gotchi-disclaimer {
    font-size: 2rem;
    color: var(--col-info-200);
    text-align: center;
    margin-top: 0.4rem;
  }

  .cta-baazaar-container {
    position: absolute;
    z-index: 1;
    width: 100%;
    bottom: -1rem;
  }

  @media (min-width: 1127px) {
    .gotchi-list-inner {
      grid-template-columns: 1fr 1fr 1fr;
    }
  }

  @media (min-width: 1200px) {
    .gotchi-list-inner {
      grid-template-columns: 1fr 1fr 1fr;
    }
    .cta-baazaar-container {
      left: 3.75rem;
      right: 0.75rem;
      width: auto;
      bottom: 2rem;
    }
    .empty-state > h4 {
      text-transform: uppercase;
      font-size: 2.8rem;
      line-height: 2.8rem;
    }
    .empty-state > p {
      font-size: 2.8rem;
      line-height: 2.8rem;
      width: 80%;
    }
    .nakey-gotchi-disclaimer {
      font-size: 2.4rem;
    }
  }

  /************************************/
  /********* Halloween Style **********/
  /************************************/

  .halloween .filter-option .filter-name {
    color: var(--col-halloween-400);
  }

  // .halloween .scrollable::-webkit-scrollbar-thumb {
  //   background: var(--col-halloween-400);
  //   box-shadow: 0 0 0.8rem 0.1rem var(--col-halloween-border);
  // }
`;
