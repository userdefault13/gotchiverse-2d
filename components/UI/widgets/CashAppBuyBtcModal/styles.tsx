import css from 'styled-jsx/css';

export default css`
  .cashapp-modal {
    width: min(58rem, calc(100vw - 3rem));
    max-height: calc(100vh - 4rem);
    overflow-y: auto;
    padding: 1.5rem;
    color: #fff8ee;
    background:
      linear-gradient(135deg, rgba(0, 214, 79, 0.09), transparent 34%),
      rgba(7, 9, 12, 0.97);
    border: 0.25rem solid rgba(247, 147, 26, 0.8);
    box-shadow:
      0 0 0 0.25rem rgba(0, 214, 79, 0.18),
      0 0 2.4rem rgba(247, 147, 26, 0.2);
  }

  .brand-header {
    display: flex;
    align-items: center;
    gap: 1.4rem;
    margin-bottom: 1.2rem;
  }

  .cashapp-mark {
    display: inline-flex;
    width: 6.4rem;
    height: 6.4rem;
    flex: 0 0 6.4rem;
    filter: drop-shadow(0 0 0.8rem rgba(0, 214, 79, 0.55));
  }

  .cashapp-mark svg {
    width: 100%;
    height: 100%;
  }

  .title {
    margin: 0 0 0.35rem;
    font-size: 4.3rem;
    line-height: 1.1;
    color: #fff;
  }

  .brand-name {
    color: #00d64f;
    font-size: 2.1rem;
    letter-spacing: 0.09em;
  }

  .lead {
    margin: 0 0 1.5rem;
    font-size: 2.35rem;
    line-height: 1.4;
    opacity: 0.92;
  }

  .steps {
    list-style: none;
    margin: 0 0 1.2rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  .step {
    border: 0.2rem solid rgba(247, 147, 26, 0.45);
    background: rgba(0, 0, 0, 0.35);
    padding: 1.3rem 1.4rem;
  }

  .cashapp-step {
    border-color: rgba(0, 214, 79, 0.75);
    background: linear-gradient(135deg, rgba(0, 214, 79, 0.14), rgba(0, 0, 0, 0.45));
  }

  .step-label {
    display: block;
    font-size: 2rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--col-btc-neon, #f7931a);
    margin-bottom: 0.6rem;
  }

  .cashapp-step .step-label {
    color: #00d64f;
  }

  .step p {
    margin: 0 0 0.9rem;
    font-size: 2.25rem;
    line-height: 1.4;
  }

  .step-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
  }

  .cashapp-cta {
    display: inline-flex;
    flex: 1 1 20rem;
  }

  .cashapp-cta :global(button) {
    width: 100%;
    min-height: 5.4rem;
    color: #061108 !important;
    background: #00d64f !important;
    border-color: #66ff9e !important;
    box-shadow: 0.35rem 0.35rem 0 #007a2d !important;
  }

  .cashapp-cta :global(button:hover) {
    background: #22ed6e !important;
  }

  .referral-cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 0.8rem;
  }

  .referral-card {
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
  }

  .referral-card h3 {
    margin: 0.8rem 0 0.4rem;
    color: #fff;
    font-size: 2.3rem;
    line-height: 1.15;
  }

  .referral-card p {
    margin: 0 0 0.8rem;
    color: rgba(255, 255, 255, 0.78);
    font-size: 1.85rem;
    line-height: 1.35;
  }

  .referral-visual {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 0.92;
    overflow: hidden;
    border-radius: 1.2rem;
    background: #5ce13d;
  }

  .qr-card {
    display: grid;
    place-items: center;
    padding: 0.8rem;
    background: #e9e6e0;
  }

  .cashapp-qr {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .code-card {
    display: grid;
    place-items: center;
    padding: 1.2rem;
  }

  .code-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    width: 100%;
    padding: 1rem 1.2rem;
    border: 0.3rem solid #071007;
    border-radius: 999px;
    background: transparent;
    color: #071007;
    font-family: inherit;
    font-size: 2rem;
    cursor: pointer;
  }

  .copy-glyph {
    font-family: Arial, sans-serif;
    font-size: 2.4rem;
  }

  .text-action {
    padding: 0;
    border: 0;
    background: transparent;
    color: #5ce13d;
    font-family: inherit;
    font-size: 1.8rem;
    text-decoration: underline;
    cursor: pointer;
  }

  .send-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 2rem 2rem 1rem;
    color: #fff;
  }

  .send-amount {
    font-family: Arial, sans-serif;
    font-size: 4.8rem;
    font-weight: 700;
    line-height: 1;
  }

  .keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.8rem 2.5rem;
    font-family: Arial, sans-serif;
    font-size: 1.4rem;
    font-weight: 600;
  }

  .code-chip {
    display: inline-block;
    margin-left: 0.35rem;
    padding: 0.1rem 0.45rem;
    border: 0.18rem solid #00d64f;
    color: #8cffb6;
    font-size: 1.65rem;
    letter-spacing: 0.06em;
  }

  .qr-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.4rem;
  }

  .qr {
    width: 18rem;
    height: 18rem;
    image-rendering: pixelated;
    background: #fff;
    padding: 0.6rem;
    border: 0.25rem solid var(--col-btc-neon, #f7931a);
  }

  .addr {
    min-width: 0;
    flex: 1 1 24rem;
    word-break: break-all;
    font-size: 1.9rem;
    text-align: left;
    opacity: 0.9;
  }

  .address-row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.7rem;
    border: 0.15rem solid rgba(247, 147, 26, 0.55);
    background: rgba(0, 0, 0, 0.45);
  }

  .address-row :global(button) {
    flex: 0 0 auto;
  }

  .hint {
    margin: 0.4rem 0 0;
    font-size: 2rem;
    opacity: 0.8;
  }

  .error {
    margin: 0.4rem 0 0;
    font-size: 1.55rem;
    color: #ff8a8a;
  }

  .footer-note {
    margin: 0.8rem 0 0;
    font-size: 1.45rem;
    opacity: 0.75;
  }

  @media (max-width: 640px) {
    .cashapp-modal {
      width: calc(100vw - 1.5rem);
      max-height: calc(100vh - 1.5rem);
      padding: 1.1rem;
    }

    .cashapp-mark {
      width: 5rem;
      height: 5rem;
      flex-basis: 5rem;
    }

    .title {
      font-size: 3.2rem;
    }

    .lead,
    .step p {
      font-size: 1.9rem;
    }

    .referral-cards {
      grid-template-columns: 1fr;
    }

    .referral-visual {
      max-width: 24rem;
      margin: 0 auto;
    }

    .address-row {
      flex-direction: column;
      align-items: stretch;
    }

    .addr {
      flex-basis: auto;
      text-align: center;
    }
  }
`;
