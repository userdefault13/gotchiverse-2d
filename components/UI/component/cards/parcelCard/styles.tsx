import css from 'styled-jsx/css';

export default css`
  .parcel-card {
    padding: 0.5em;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    position: relative;
    border-radius: 4px;
  }
  .parcel-card.narrow {
    border: 2px solid rgba(74, 219, 251, 0.8);
    background: rgba(0, 32, 114, 0.8);
    box-shadow: 0px 0.917885px 7.34308px rgba(0, 0, 0, 0.7);
  }
  .parcel-card.wide {
    background: transparent;
  }

  .parcel-card:hover,
  .parcel-card.active {
    border-color: var(--col-pink-400);
    background: rgba(207, 0, 199, 0.27);
  }
  .parcel-card.wide {
    padding: 0.5em 1em;
    border: 0.4rem solid transparent;
  }
  .parcel-card.wide:hover,
  .parcel-card.wide.active {
    border-color: var(--col-pink-400);
    background: rgba(200, 0, 185, 0.16);
    border-radius: 2px;
  }
  .parcel-card.borrowed:hover,
  .parcel-card.wide.borrowed:hover,
  .parcel-card.borrowed.active,
  .parcel-card.wide.borrowed.active {
    border-color: var(--col-info-400);
    background: rgba(0, 185, 225, 0.16);
  }
  .parcel-card.halloween:hover {
    border-color: var(--col-halloween-400);
    background-color: rgba(231, 94, 17, 0.2);
  }
  .parcel-card.halloween:hover,
  .parcel-card.halloween.active {
    border-color: var(--col-pink-400);
    background-color: rgba(200, 42, 194, 0.2);
  }

  .parcel-card.disabled:hover {
    border-color: var(--col-halloween-400);
    background-color: rgba(231, 94, 17, 0.2);
  }
  .parcel-card.disabled:hover,
  .parcel-card.disabled.active {
    border-color: var(--col-pink-400);
    background-color: rgba(200, 42, 194, 0.2);
  }

  .img-container {
    border-color: var(--col-pink-border);
    border: 2px solid var(--col-pink-border);
    margin-top: auto;
    margin-bottom: auto;
  }
  .img-container.borrowed {
    border-color: var(--col-blue-border);
  }
  .parcel-card.halloween .img-container {
    border: 0.2em solid var(--col-halloween-400);
  }

  .parcel-card.disabled,
  .parcel-card.disabled:hover,
  .parcel-card.disabled.active {
    background: rgba(0, 32, 114, 0.6);
    border: 2px solid rgba(72, 171, 255, 0.75);
    box-shadow: 0px 0.917885px 7.34308px rgba(0, 0, 0, 0.4);
  }

  .img-container.disabled {
    color: var(--col-info-400);
    width: 9em;
    height: 9em;
    background: rgba(0, 185, 225, 0.2);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .detail-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    padding: 0.4rem 0 0.4rem 1em;
    flex: 1;
  }

  .parcel-card-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0 0.35em 0 0.2em;
  }

  .view-btn {
    appearance: none;
    cursor: pointer;
    font-family: Kimberley Rg, sans-serif;
    font-size: 1.55em;
    line-height: 1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #e8fbff;
    background: rgba(0, 40, 90, 0.85);
    border: 2px solid rgba(74, 219, 251, 0.95);
    border-radius: 3px;
    padding: 0.55em 0.75em;
    box-shadow: 0 0 8px rgba(0, 185, 225, 0.25);
    transition: border-color 0.12s ease, background 0.12s ease, color 0.12s ease;
  }

  .view-btn:hover {
    border-color: var(--col-pink-400);
    background: rgba(207, 0, 199, 0.35);
    color: #fff;
  }

  .parcel-card.active .view-btn {
    border-color: var(--col-pink-400);
    background: rgba(207, 0, 199, 0.45);
    color: #fff;
  }

  .wide .detail-wrapper {
    flex-direction: row;
  }

  .parcel-loc-info {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }
  .wide .parcel-loc-info {
  }
  .parcel-loc-info .name {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;

    text-transform: capitalize;
    font-size: 2.5em;
    line-height: 0.7;
    margin-top: auto;
    margin-bottom: auto;
    color: var(--col-white);
  }
  .wide .parcel-loc-info .name {
    margin-top: 0;
    font-size: 3.6em;
  }

  .parcel-card:hover .name,
  .parcel-card.active .name {
    color: var(--col-pink-200);
  }
  .parcel-card.borrowed:hover .name,
  .parcel-card.borrowed.active .name {
    color: var(--col-info-400);
  }

  .parcel-loc-info .district {
    color: var(--col-pink-400);
    font-size: 2em;
    line-height: 1;
  }
  .parcel-card.borrowed .district {
    color: var(--col-info-400);
  }
  .parcel-card:hover .district,
  .parcel-card.active .district {
    color: var(--col-magenta-200);
  }
  .parcel-card.borrowed:hover .district,
  .parcel-card.borrowed.active .district {
    color: var(--col-info-800);
  }
  .wide .parcel-loc-info .district {
    font-size: 3.2em;
  }

  .token-id {
    color: var(--col-grey-200);
    font-size: 1em;
  }

  .info-container {
    display: flex;
    gap: 1em;
  }

  .narrow .info-container {
    margin-top: 0.5em;
    height: 2.5em;
  }

  .wide .info-container {
    flex-direction: column;
    justify-content: flex-end;
    padding-bottom: 0.4rem;
  }

  // Channel
  .channel-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(-90deg, rgba(217, 217, 217, 0.3) 1.08%, rgba(217, 217, 217, 0) 118.82%);
    width: 10em;
    padding-right: 0.5em;
  }
  .wide .channel-icon {
    display: flex;
    justify-content: flex-end;
    padding-right: 0.4rem;
    background: linear-gradient(-90deg, rgba(217, 217, 217, 0.2) 1.08%, rgba(217, 217, 217, 0) 118.82%);
    width: 11em;
  }

  .channel-icon .time-left {
    display: block;
    margin-left: 0.8em;
    font-size: 2em;
    line-height: 1.2;
    color: var(--col-grey-200);
    white-space: nowrap;
  }

  .wide .channel-icon .time-left {
    font-size: 2.4rem;
    line-height: 2rem;
    margin-left: 0.8rem;
    margin-bottom: 0.4rem;
  }

  .parcel-card.borrowed .channel-icon {
    background: linear-gradient(90deg, rgba(160, 101, 255, 0.3) 1.08%, rgba(160, 101, 255, 0) 118.82%);
  }

  .wide .channel-icon.ready {
    background: linear-gradient(to left, rgba(160, 101, 255, 0.3) 1.08%, rgba(160, 101, 255, 0) 118.82%);
  }

  .channel-icon.ready .time-left {
    color: var(--col-purple-300);
  }

  .level-icon {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 10em;
    background: linear-gradient(90deg, rgba(200, 42, 194, 0.3) 1.08%, rgba(200, 42, 194, 0) 118.82%);
  }

  .wide .level-icon {
    display: flex;
    justify-content: flex-end;
    padding-right: 0.4rem;
    background: linear-gradient(90deg, rgba(200, 42, 194, 0.3) 1.08%, rgba(0, 185, 243, 0) 118.82%);
    width: 11em;
  }

  .level-icon.borrowed,
  .wide .level-icon.borrowed {
    background: linear-gradient(90deg, rgba(0, 185, 243, 0.3) 1.08%, rgba(0, 185, 243, 0) 118.82%);
  }

  .level-icon .level-value {
    color: var(--col-pink-400);
    margin-left: 0.4rem;
    font-size: 2rem;
    line-height: 1.2;
    white-space: nowrap;
  }

  .wide .level-icon .level-value {
    font-size: 2.4rem;
    line-height: 2rem;
    margin-left: 0.8rem;
    margin-bottom: 0.4rem;
  }

  .level-icon.borrowed .level-value {
    color: var(--col-info-300);
  }

  .borrowed-icon {
    width: 1em;
    aspect-ratio: 1/1;
    line-hight: 0;
    vertical-align: middle;
    position: relative;
  }
`;
