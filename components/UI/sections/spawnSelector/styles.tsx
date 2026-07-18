import css from 'styled-jsx/css';

export default css`
  .overlay {
    position: fixed;
    z-index: 200000;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .content-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 63rem;
    max-height: 80vh;
    padding-top: 10rem;
    padding-bottom: 5rem;
  }
  .content-container h1 {
    color: var(--col-white);
    text-transform: uppercase;
    font-weight: bold;
    font-size: 5.4rem;
    letter-spacing: 2px;
    margin-bottom: 1.5rem;
  }

  .panel-content {
    height: 100%;
  }

  .event-list {
    width: 100%;
    height: 100%;
    padding-top: 1.5rem;
  }

  .district-container {
    bottom: 0;
    padding: 1rem 1rem 0 1rem;
  }

  .parcels {
    height: 100%;
    padding: 1.5rem 0;
  }

  // .scrollable.locations {
  //   height: 100%;
  //   max-height: calc(100vh - 49rem);
  // }

  // .halloween .scrollable::-webkit-scrollbar-thumb {
  //   background: var(--col-halloween-400);
  //   box-shadow: 0 0 0.8rem 0.1rem var(--col-halloween-border);
  // }

  .parcel-fetch-animation {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .filter-container,
  .locations-filter {
    padding: 0 0 4px 0;
    padding-right: 2.4rem;
    display: flex;
    align-items: flex-end;
    column-gap: 1rem;
    justify-content: space-between;
    margin-bottom: 1.6rem;
  }

  .sort {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    justify-content: flex-end;
  }

  .sort > span {
    color: var(--col-pink-400);
    font-size: 1.6rem;
    line-height: 1.6rem;
    text-align: center;
  }

  .district {
    width: 6.4rem;
  }

  .owned-borrowed {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .owned-option {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    color: var(--col-pink-400);
    font-size: 1.8rem;
    line-height: 1.2rem;
  }

  .toggle-title {
    font-size: 1.6rem;
    line-height: 1;
    color: var(--col-pink-400);
  }

  .searching-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 3px 0.6rem 0rem 0.6rem;
  }
  .searching-container p {
    color: var(--col-info-400);
    margin: 0 0.8rem 0 0;
  }
  .channel-filter p {
    color: var(--col-pink-400);
  }
  .channel-filter.active p {
    opacity: 0.5;
  }

  .tabs-container {
    position: absolute;
    top: 0;
    left: 6.4rem;
    right: 6.4rem;
    transform: translateY(calc(-50% - 2px));
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2.4rem;
  }

  .tab {
    height: 5.4rem;
    background-color: var(--col-black);
    color: var(--col-white);
    border: 2px solid var(--col-pink-border);
    border-radius: 4px;
    text-transform: uppercase;
    font-size: 3.2rem;
    box-shadow: 0 0 4px 1px var(--col-pink-border);
  }
  .tab:not(.active):hover {
    box-shadow: 0 0 0.8rem 2px var(--col-pink-border);
  }
  .tab.active {
    background-color: var(--col-pink-500);
  }
  .close-icon-container {
    position: absolute;
    top: 9.5rem;
    right: -4.5rem;
  }

  .custom-spawn-container {
    position: absolute;
    left: calc(100% + 4rem);
    width: 30rem;
    bottom: 4px;
  }

  .custom-spawn-container p {
    text-shadow: 0 0 4px var(--col-black);
    text-align: center;
    font-size: 2.4rem;
  }

  .inner-button {
    display: flex;
  }
  .inner-button .button-img {
    position: absolute;
    top: 0.8rem;
    left: 0.8rem;
    border: 2px solid var(--col-purple-300);
    height: 7.5rem;
    width: 7.5rem;
  }
  .inner-button.aarena .button-img {
    border: none;
  }

  .inner-button p {
    text-align: left;
    text-transform: uppercase;
    font-size: 4.2rem;
    line-height: 3.3rem;
    margin-bottom: 0;
    text-shadow: none;
    margin-left: 9.2rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .empty-state h2 {
    text-transform: uppercase;
    font-size: 4rem;
    margin-bottom: 2.4rem;
  }
  .empty-state h4 {
    color: var(--col-pink-400);
    font-size: 4rem;
    text-align: center;
    line-height: 1;
    margin-bottom: 2.4rem;
    padding: 0rem 7.5rem;
  }
  .empty-state .baazaar-link-container {
    width: 28rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-left: 2.4rem;
  }
  .baazaar-link-container .baazaar-img {
    border: 2px solid var(--col-pink-400);
    border-bottom: none;
    border-top-left-radius: 0.8rem;
    border-top-right-radius: 0.8rem;
    margin-bottom: -4px;
    box-shadow: 0 0 4px 2px var(--col-pink-400);
    width: 27.2rem;
    height: auto;
    padding: 1.6rem;
  }
  .baazaar-link-container .baazaar-link {
    width: 100%;
  }

  /***************************************/
  /********** Halloween Style ************/
  /***************************************/

  .halloween .sort > span {
    color: var(--col-halloween-400);
  }

  .halloween .owned-option {
    color: var(--col-halloween-400);
  }

  .halloween .toggle-title {
    color: var(--col-halloween-400);
  }

  .halloween .channel-filter p {
    color: var(--col-halloween-400);
  }

  .halloween .tab {
    border: 2px solid var(--col-halloween-border);
    box-shadow: 0 0 4px 1px var(--col-halloween-border);
  }

  .halloween .tab:not(.active):hover {
    box-shadow: 0 0 0.8rem 2px var(--col-halloween-border);
  }

  .halloween .tab.active {
    background-color: var(--col-halloween-500);
  }

  .halloween .empty-state h4 {
    color: var(--col-pink-400);
    font-size: 4rem;
    text-align: center;
    line-height: 1;
    margin-bottom: 2.4rem;
    padding: 0rem 7.5rem;
  }

  .halloween .baazaar-link-container .baazaar-img {
    border: 2px solid var(--col-halloween-400);
    box-shadow: 0 0 4px 2px var(--col-halloween-400);
  }
`;
