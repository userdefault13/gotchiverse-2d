import css from 'styled-jsx/css';

export default css`
  .hologram-container {
    top: calc(50% - 15rem);
    height: 30rem;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    z-index: 200;
    pointer-events: auto;
  }
  .event-container {
    display: flex;
  }
  .event-image-container {
    background: rgba(58, 0, 56, 0.8);
    box-shadow: 0px 0px 5px var(--col-pink-350);
    position: relative;
    border: 0.2rem solid var(--col-pink-border);
    border-left: none;
    filter: drop-shadow(0 0 4px var(--col-pink-400));
  }
  .event-image-container .left-cap {
    background: rgba(58, 0, 56, 0.8);
    position: absolute;
    width: 1.4rem;
    top: 1.2rem;
    left: -1.4rem;
    height: calc(100% - 2.4rem);
    border: 0.2rem solid var(--col-pink-border);
    border-right: none;
  }
  .event-image-container .left-cap:before,
  .event-image-container .left-cap:after {
    position: absolute;
    content: '';
    width: 1.2rem;
    height: 1.6rem;
    border-right: 0.2rem solid var(--col-pink-border);
  }
  .left-cap:before {
    top: -1.6rem;
  }
  .left-cap:after {
    bottom: -1.6rem;
  }
  .img-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0.4rem;
    margin-left: -0.8rem;
    top: 0rem;
    left: 0.4rem;
    background: var(--col-pink-400);
    width: 29rem;
    height: calc(100% - 0.75rem);
    clip-path: polygon(
      1.5rem 0rem,
      100% 0rem,
      100% 100%,
      1.5rem 100%,
      1.5rem calc(100% - 1.5rem),
      0rem calc(100% - 1.5rem),
      0rem 1.5rem,
      1.5rem 1.5rem
    );
  }
  .img-wrapper .inner {
    position: relative;
    width: calc(100% - 0.6rem);
    height: calc(100% - 0.6rem);
    display: flex;
    align-items: center;
    clip-path: polygon(
      1.5rem 0rem,
      100% 0rem,
      100% 100%,
      1.5rem 100%,
      1.5rem calc(100% - 1.5rem),
      0rem calc(100% - 1.5rem),
      0rem 1.5rem,
      1.5rem 1.5rem
    );
  }
  .event-info-container {
    position: relative;
    background-size: 100%0.8rem;
    border-top: 0.2rem solid var(--col-pink-border);
    border-bottom: 0.2rem solid var(--col-pink-border);
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 70%, rgba(241, 230, 242, 0.4) 100%);
    background-size: 100% 0.8rem;
    width: 35rem;
  }
  .link-copied {
    position: absolute;
    font-size: 1.8rem;
    line-height: 1;
    color: var(--col-pink-400);
    top: -2rem;
    right: 0;
  }
  .event-info-container.empty {
    width: 36rem;
  }
  .event-info-container .bg-wrapper {
    height: 100%;
    background: linear-gradient(
      to left,
      rgba(82, 0, 79, 0) 0%,
      rgba(82, 0, 79, 0.54) 17.71%,
      rgba(65, 0, 62, 0.74) 43.75%,
      rgba(58, 0, 56, 0.85) 81.25%
    );
  }
  .bg-wrapper .inner {
    display: flex;
    height: 100%;
    flex-direction: column;
    padding: 1rem 1rem 1rem 1.8rem;
  }

  .bg-wrapper .inner .title-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.6rem;
  }
  .title-wrapper .title {
    color: var(--col-white);
    font-size: 2.8rem;
    line-height: 1;
    width: 90%;
  }
  .info-wrapper {
    display: flex;
    flex-grow: 1;
    justify-content: space-between;
    margin-bottom: auto;
  }
  .info-wrapper .event-time {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .event-time .start-time {
    color: var(--col-purple-300);
    display: flex;
    align-items: center;
  }

  .event-time .start-time .icon {
    display: flex;
    position: relative;
    width: 1.4rem;
    height: 1.4rem;
  }

  .event-time .start-time .text {
    margin: 0 0 0 0.7rem;
    font-size: 2rem;
    line-height: 0.8;
  }

  .info-wrapper .price {
    display: flex;
    align-items: baseline;
    color: var(--col-info-400);
  }

  .info-wrapper .price .icon {
    display: flex;
    width: 1.4rem;
    height: 1.4rem;
  }

  .info-wrapper .price .text {
    margin: 0 0 2px 0.7rem;
    font-size: 3rem;
    line-height: 2.8rem;
  }

  .event-time .end-time {
    color: var(--col-pink-200);
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
  }

  .event-time .end-time .icon {
    position: relative;
    width: 1.2rem;
    height: 1.2rem;
  }

  .event-time .end-time .text {
    margin: 0 0 2px 0.7rem;
    font-size: 1.8rem;
    line-height: 0.8;
  }
  .btn-wrapper {
    margin: auto;
    display: flex;
    gap: 10px;
    width: 100%;
  }
  .cta {
    max-width: 50%;
  }
  .ray-container {
    position: relative;
    width: 85%;
    height: 20rem;
    margin-left: 5%;
  }
  .ray-container.empty {
    width: 100%;
    height: 20rem;
    margin-left: 0;
  }
  .event-image-container .inner-box {
    background: rgba(58, 0, 56, 0.8);
    position: relative;
    height: 7rem;
    border: 0.3rem solid var(--col-pink-border);
    border-left: none;
    margin: 0.2rem;
  }
  .event-image-container .inner-box .left-cap {
    position: absolute;
    width: 1.2rem;
    top: 1.2rem;
    left: -1.2rem;
    height: calc(100% - 2.2rem);
    border: 0.3rem solid var(--col-pink-border);
    border-right: none;
  }
  .event-image-container .inner-box .left-cap:before,
  .event-image-container .inner-box .left-cap:after {
    position: absolute;
    content: '';
    width: 1.2rem;
    height: 1.6rem;
    border-right: 0.3rem solid var(--col-pink-border);
  }
  .event-image-container .inner-box .left-cap:before {
    top: -1.6rem;
  }
  .event-image-container .inner-box .left-cap:after {
    bottom: -1.6rem;
  }
  .inner-box .content {
    display: flex;
    gap: 0.8rem;
    height: 100%;
    align-items: center;
    justify-content: center;
    padding: 0.4rem 1.2rem;
  }
  .inner-box .content .text {
    width: 15rem;
    font-size: 2.2rem;
    line-height: 2rem;
    color: var(--col-pink-400);
  }
  .inner-box .content .toolbox-wrapper {
    position: relative;
    width: 3.6rem;
    height: 3.6rem;
  }
`;
