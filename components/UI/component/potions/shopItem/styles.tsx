import css from 'styled-jsx/css';

export default css`
  .shop-item-component {
    width: 16.5rem;
    height: 19rem;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: inset 0px 0px 31px 5px rgba(0, 37, 167, 0.7);
    background: linear-gradient(0deg, var(--col-blue-250), var(--col-blue-250)), linear-gradient(0deg, var(--col-blue-600), var(--col-blue-600)),
      var(--col-blue-650);
    border: 3px solid var(--col-blue-border);
  }

  .shop-item-component.enemy-type {
    background: linear-gradient(0deg, var(--col-purple-250), var(--col-purple-250)),
      linear-gradient(0deg, var(--col-purple-600), var(--col-purple-600)), var(--col-purple-650);
    border: 3px solid var(--col-purple-border);
  }
  .msg-coming {
    font-family: 'Alien Encounters Solid';
    text-transform: uppercase;
    color: rgba(0, 185, 255, 0.8);
    font-size: 2.1rem;
    line-height: 1.2;
    width: 60%;
    height: 100%;
    text-align: center;
  }
  .title-section {
    width: 100%;
    border-radius: 2px 2px 0px 0px;
    padding: 0 0.8rem;
    background: var(--col-blue-550);
    color: var(--col-white);
    font-size: 2.2rem;
    font-weight: 400;
    white-space: nowrap;
    min-height: 3rem;
    line-height: 0.9;
    padding-bottom: 0.4rem;
    text-align: center;
    text-shadow: 0.4px -0.2px 0 var(--col-white);
    text-transform: uppercase;
  }
  .shop-item-component.boosts-type .quantity {
    color: var(--col-info-800);
    text-shadow: 0.4px -0.2px 0 var(--col-info-800);
  }
  .shop-item-component.enemy-type .quantity {
    color: #ccacff;
    text-shadow: 0.4px -0.2px 0 #ba91ff;
  }
  .shop-item-component.enemy-type .title-section {
    background: var(--col-purple-450);
  }
  .item-info {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 12rem;
  }
  .item-image-container {
    position: relative;
    width: 70%;
    height: 8.5rem;
    max-height: 80%;
    margin-left: auto;
    margin-right: 0.4rem;
    overflow: hidden;
  }
  .item-description-wrapper {
    position: absolute;
    top: 1rem;
    left: 1rem;
    width: 9rem;
    display: flex;
    align-items: center;
    gap: 0.2em;
  }
  .shop-item-component.enemy-type .item-description-wrapper {
    align-items: flex-start;
    justify-content: center;
    flex-direction: column;
    gap: 0.1em;
    width: 80%;
  }
  .item-description-wrapper .icon-container {
    position: relative;
    width: 1.2em;
    height: 1.2em;
    min-width: 1.6rem;
  }
  .item-description-wrapper .description-text {
    font-size: 1.8rem;
    line-height: 0.8;
    word-break: break-word;
    padding-bottom: 0.2rem;
    color: var(--col-info-800);
    text-shadow: 0.4px -0.2px 0 var(--col-info-800);
  }
  .item-description-wrapper .description-items {
    display: block;
  }
  .item-description-wrapper .description-item {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.4rem;
    font-size: 1.4rem;
  }
  .item-description-wrapper .description-icon {
    position: relative;
    display: inline-block;
    flex: 0 0 auto;
    width: 1.4rem;
    height: 1.4rem;
  }
  .cost-wrapper {
    position: absolute;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 3rem;
    background: linear-gradient(180deg, rgba(0, 26, 91, 0) 11.98%, rgba(1, 8, 159, 0.4) 71.84%);
  }
  .shop-item-component.enemy-type .cost-wrapper {
    background: linear-gradient(180deg, rgba(0, 26, 91, 0) 11.98%, #01089f 71.84%);
  }
  .item-price-container {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    justify-content: center;
    margin: 0 0.2rem;
  }
  .item-price-alchemica {
    width: 1.2rem;
    height: 1.2rem;
    position: relative;
  }
  .item-price {
    font-family: 'Alien Encounters Solid';
    font-size: 1.3rem;
    line-height: 1;
    text-shadow: 0 1px 0.8px rgba(0, 0, 0, 0.5), 0 -1px 0.8px rgba(0, 0, 0, 0.5), 1px 0 0.8px rgba(0, 0, 0, 0.5), -1px 0 0.8px rgba(0, 0, 0, 0.5);
    padding-top: 0.2rem;
  }
  .item-price.fud {
    color: var(--col-green-200);
  }
  .item-price.fomo {
    color: var(--col-text-fomo-bold);
  }
  .item-price.kek {
    color: var(--col-purple-250);
  }
  .item-price.alpha {
    color: var(--col-info-250);
  }
  .cta-container {
    display: flex;
    background: var(--col-blue-450);
    border-top: 0.3rem solid var(--col-blue-border);
    height: 3.4rem;
  }
  .shop-item-component.enemy-type .cta-container {
    background: var(--col-purple-450);
    border-top: 0.3rem solid var(--col-purple-300);
  }
  .cta {
    background: var(--col-yellow-100);
    border-radius: 2px;

    font-family: 'Alien Encounters Solid';
    font-size: 1.6rem;
    line-height: 1.4rem;
    font-weight: 700;
    border: none;
    border-bottom: 0.4rem solid var(--col-yellow-400);
    flex-grow: 1;
  }
  .counter {
    width: 50%;
    text-align: center;
    color: var(--col-white);
    font-size: 2.5rem;
    line-height: 2.2rem;
    font-weight: 700;
    padding-top: 0.2rem;
  }

  .tooltip-container {
    position: absolute;
    background: linear-gradient(180.9deg, rgba(40, 4, 117, 0.9) 0.77%, rgba(0, 67, 130, 0.9) 99.23%);
    border: 2px solid var(--col-info-400);
    box-shadow: 0px 0px 6px #48abff, 0px 3px 14px rgba(17, 0, 38, 0.8);
    border-radius: 2px;
    padding: 0.5rem 0.75rem;
    transition: all 0.2s ease-in-out;
    z-index: 100;
    left: 2em;
    bottom: 3em;
    font-size: 1.2em;
    color: white;
    line-height: 1em;
    width: 12.5em;
    height: fit-content;
    transform: translate(-75%, -50%);
  }

  .tooltip-container .trait-label {
    color: var(--col-info-200);
    text-transform: uppercase;
    font-weight: 400;
  }
  .tooltip-container .trait-description {
    margin-bottom: 0.4em;
  }
  .tooltip-container .trait-details {
    gap: 0;
    display: flex;
  }
  .tooltip-container .trait-icon {
    position: relative;
    flex: 0 0 auto;
    width: 0.9em;
    height: 0.9em;
  }
  .tooltip-container .trait-value {
    padding-left: 0.25em;
  }
`;
