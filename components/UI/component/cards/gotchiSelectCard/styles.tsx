import css from 'styled-jsx/css';

export default css`
  .gotchi-panel {
    position: relative;
    flex: 1 0 auto;
    border-radius: 0.4rem;
    transition: box-shadow 0.1s ease-in-out;
  }

  .gotchi-panel:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 0.3rem solid var(--border-color);
    border-radius: 0.4rem;
    z-index: -1;
  }

  .gotchi-panel.selected,
  .gotchi-panel:hover {
    box-shadow: 0px 0px 8px var(--col-yellow-100), 0px 0px 8px var(--col-yellow-100);
  }

  .gotchi-img-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translateY(-0.1rem) scale(1.15);
    height: 11rem;
  }
  .gotchi-img-wrapper.spectator {
    transform: translateY(0) scale(0.85);
  }
  .gotchi-img {
    position: relative;
  }
  .gotchi-img:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--box-inner-bg);
    box-shadow: var(--box-inner-shadow);
    border: 0.3rem solid var(--border-color);
    border-radius: 0.4rem;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom: none;
    z-index: -1;
  }

  .gotchi-name {
    font-family: Pixelar, sans-serif;
    font-size: 1.2rem;
    line-height: 1.4;
    background: var(--label-bg-color);
    margin: 0;
    padding: 0.8rem 0.8rem;
    text-align: center;
    color: white;
    border-bottom-left-radius: 0.4rem;
    border-bottom-right-radius: 0.4rem;
    z-index: 20;
  }

  .icons {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 0;
    display: grid;
    grid-template-areas: 'top-left . top-right' '. . .' 'bottom-left . bottom-right';
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr;
    align-items: center;
    justify-items: center;
  }

  .icons .spacer {
    grid-area: spacer;
    width: 100%;
    height: 100%;
  }

  .icons .top-left {
    grid-area: top-left;
  }
  .icons .top-right {
    grid-area: top-right;
  }
  .icons .bottom-left {
    grid-area: bottom-left;
  }
  .icons .bottom-right {
    grid-area: bottom-right;
  }

  .free-tag {
    display: block;
    transform: scale(1.5) translate(0.5rem, 0.5rem);
  }

  // .channel-icon {
  //   position: absolute;
  //   bottom: 2rem;
  //   right: 0.4rem;
  //   z-index: 1;
  // }
  // .borrowed-icon {
  //   position: absolute;
  //   top: 0.4rem;
  //   right: 0.4rem;
  //   padding: 0.3rem;
  //   z-index: 1;
  // }

  // .gotchi-img-container {
  //   display: flex;
  //   justify-content: center;
  //   border-width: 0.3rem;
  //   border-style: solid;
  //   border-color: var(--col-pink-border);
  //   border-bottom: none;
  // }
  // .common .gotchi-img-container {
  //   background: var(--col-gotchi-common-400);
  //   box-shadow: 0px 3.85075px 3.85075px rgba(0, 0, 0, 0.25), inset 0px 0px 14.4403px 2.88806px rgba(7, 44, 238, 0.67);
  // }
  // .uncommon .gotchi-img-container {
  //   background: var(--col-gotchi-uncommon-400);
  //   box-shadow: 0px 3.85075px 3.85075px rgba(0, 0, 0, 0.25), inset 0px 0px 14.4403px 2.88806px rgba(7, 44, 238, 0.67);
  // }
  // .rare .gotchi-img-container {
  //   background: var(--col-gotchi-rare-400);
  //   box-shadow: 0px 3.85075px 3.85075px rgba(0, 0, 0, 0.25), inset 0px 0px 14.4403px 2.88806px rgba(7, 44, 238, 0.67);
  // }
  // .legendary .gotchi-img-container {
  //   background: var(--col-gotchi-legendary-400);
  //   box-shadow: 0px 3.85075px 3.85075px rgba(0, 0, 0, 0.25), inset 0px 0px 14.4403px 2.88806px rgba(7, 44, 238, 0.67);
  // }
  // .gotchi-panel {
  //   border-radius: 0.4rem;
  //   overflow: hidden;
  //   background-color: var(--bg-color);
  //   position: relative;
  // }

  // .gotchi-panel.selected,
  // .gotchi-panel:hover {
  //   box-shadow: 0px 0px 8px var(--col-yellow-100), 0px 0px 8px var(--col-yellow-100);
  // }
  // .gotchi-panel.common.selected .gotchi-img-container,
  // .gotchi-panel.common:hover .gotchi-img-container {
  //   box-shadow: 0px 0px 0.5rem 0.3rem var(--col-gotchi-common-400);
  // }
  // .gotchi-panel.uncommon.selected .gotchi-img-container,
  // .gotchi-panel.uncommon:hover .gotchi-img-container {
  //   box-shadow: 0px 0px 0.5rem 0.3rem var(--col-gotchi-uncommon-400);
  // }
  // .gotchi-panel.legendary.selected .gotchi-img-container,
  // .gotchi-panel.legendary:hover .gotchi-img-container {
  //   box-shadow: 0px 0px 0.5rem 0.3rem var(--col-gotchi-legendary-400);
  // }
  // .gotchi-panel.rare.selected .gotchi-img-container,
  // .gotchi-panel.rare:hover .gotchi-img-container {
  //   box-shadow: 0px 0px 0.5rem 0.3rem var(--col-gotchi-rare-400);
  // }
  // .gotchi-panel.borrowed.common.selected .gotchi-img-container,
  // .gotchi-panel.borrowed.common:hover .gotchi-img-container {
  //   box-shadow: 0px 0px 0.5rem 0.3rem var(--col-gotchi-common-300);
  // }
  // .gotchi-panel.borrowed.uncommon.selected .gotchi-img-container,
  // .gotchi-panel.borrowed.uncommon:hover .gotchi-img-container {
  //   box-shadow: 0px 0px 0.5rem 0.3rem var(--col-gotchi-uncommon-300);
  // }
  // .gotchi-panel.borrowed.legendary.selected .gotchi-img-container,
  // .gotchi-panel.borrowed.legendary:hover .gotchi-img-container {
  //   box-shadow: 0px 0px 0.5rem 0.3rem var(--col-gotchi-legendary-300);
  // }
  // .gotchi-panel.borrowed.rare.selected .gotchi-img-container,
  // .gotchi-panel.borrowed.rare:hover .gotchi-img-container {
  //   box-shadow: 0px 0px 0.5rem 0.3rem var(--col-gotchi-rare-300);
  // }

  // .gotchi-panel.borrowed {
  //   border-color: var(--col-blue-border);
  // }

  // .gotchi-panel.borrowed:after,
  // .gotchi-panel.halloween.borrowed:after {
  //   border: 2px solid var(--col-blue-border);
  // }

  // .gotchi-panel.halloween:after,
  // .gotchi-panel.halloween.borrowed.selected:after {
  //   border: 2px solid var(--col-halloween-border);
  // }

  // .gotchi-panel.halloween.selected,
  // .gotchi-panel.halloween.borrowed.selected {
  //   box-shadow: 0 0 4px 2px var(--col-halloween-border);
  // }

  // .halloween .gotchi-name-container {
  //   background-color: var(--col-halloween-400);
  // }
  // .halloween.borrowed .gotchi-name-container {
  //   background-color: var(--col-info-400);
  // }
  // .halloween.selected .gotchi-name-container {
  //   background-color: var(--col-halloween-400);
  // }
  // .gotchi-name-container {
  //   background-color: var(--col-pink-400);
  //   border: none;
  // }
  // .gotchi-name-container p {
  //   padding: 0;
  //   margin: 0;
  //   text-align: center;
  //   white-space: nowrap;
  //   overflow: hidden;
  //   text-overflow: ellipsis;
  //   color: var(--col-white);
  // }
  // .common .gotchi-name-container {
  //   background: var(--col-gotchi-common-400);
  // }
  // .uncommon .gotchi-name-container {
  //   background: var(--col-gotchi-uncommon-400);
  // }
  // .rare .gotchi-name-container {
  //   background: var(--col-gotchi-rare-400);
  // }
  // .legendary .gotchi-name-container {
  //   background: var(--col-gotchi-legendary-400);
  // }
  // .dark-layer {
  //   position: absolute;
  //   left: 0;
  //   top: 0;
  //   width: 100%;
  //   height: 100%;
  //   display: flex;
  //   flex-direction: column;
  //   align-items: center;
  //   justify-content: center;
  //   background: rgba(0, 0, 0, 0.65);
  //   color: white;
  //   z-index: 2;
  // }
  // .dark-layer p {
  //   color: var(--col-info-800);
  //   line-height: 0.6em;
  //   text-align: center;
  // }
`;
