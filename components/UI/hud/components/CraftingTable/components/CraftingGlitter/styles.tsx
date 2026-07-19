import css from 'styled-jsx/css';
import { ParticleSprite } from 'assets/gifs';

export default css`
  .glitter-container {
    position: relative;
    width: 22rem;
    height: 7rem;
  }

  .glitter-container > span {
    display: block;
    width: 4.8rem;
    height: 4.8rem;
    background-image: url(${ParticleSprite});
    position: absolute;
  }
  .glitter-container > span:nth-child(1),
  .glitter-container > span:nth-child(2) {
    animation: shimmer1 1s steps(8) infinite;
  }

  .glitter-container > span:nth-child(1) {
    top: 5%;
    left: 20%;
    transform: scale(0.8);
  }

  .glitter-container > span:nth-child(2) {
    top: 85%;
    right: 0%;
    transform: scale(0.6);
  }

  .glitter-container > span:nth-child(3) {
    background-position: -9.6rem;
    animation: shimmer2 1s steps(8) infinite;
    top: 0;
    left: 65%;
    transform: scale(0.4);
  }

  .glitter-container > span:nth-child(4) {
    background-position: -19.2rem;
    animation: shimmer3 1s steps(8) infinite;
    bottom: 0;
    left: 0;
    transform: scale(0.7);
  }

  @keyframes shimmer1 {
    to {
      background-position: -38.4rem;
    }
  }
  @keyframes shimmer2 {
    to {
      background-position: -48rem;
    }
  }
  @keyframes shimmer3 {
    to {
      background-position: -57.6rem;
    }
  }
`;
