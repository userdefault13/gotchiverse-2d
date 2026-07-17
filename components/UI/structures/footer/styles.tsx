import css from 'styled-jsx/css';

export default css`
  .footer-container {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 3rem;
    width: 100%;
    padding: 4rem;
    background: linear-gradient(0deg, var(--col-white-200), var(--col-white-200)), var(--col-white-100);
    border: 1px solid rgba(0, 0, 0, 0.5);
    box-shadow: 0px 0px 3px rgba(0, 0, 0, 0.6);
    color: var(--col-blue-300);
  }
  .copyright {
    margin-bottom: 3rem;
  }
  .heading {
    font-size: 4rem;
    line-height: 1;
    margin-bottom: 1rem;
  }

  .link {
    color: var(--col-blue-300);
    font-size: 3rem;
    line-height: 1.1;
    text-decoration: none;
  }
  .link:hover {
    color: var(--col-blue-400);
  }
  .legal {
    font-size: 2.4rem;
    line-height: 0.9;
  }
  .logo-row {
    display: flex;
    align-items: center;
    gap: 1.6rem;
    flex-shrink: 0;
  }
  .logo-container {
    min-width: 10rem;
    max-width: 10rem;
    height: 10rem;
    position: relative;
  }
  .sections {
    display: flex;
    gap: 10rem;
    justify-content: space-evenly;
    align-items: flex-start;
  }
  .company-info {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .section {
    display: flex;
    flex-direction: column;
  }
  @media (max-width: 625px) {
    .heading {
      font-size: 4.2rem;
      line-height: 1;
    }
    .link {
      font-size: 3.1rem;
      line-height: 1.1;
    }
    .legal {
      font-size: 2.3rem;
      line-height: 1;
    }
  }
`;
