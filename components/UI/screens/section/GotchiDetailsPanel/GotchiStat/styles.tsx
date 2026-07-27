import css from 'styled-jsx/css';

export default css`
  .stat-details {
    display: flex;
    align-items: baseline;
    justify-content: flex-start;
    text-align: left;
    line-height: 1.2;
    background: #002cc7;
    border-radius: 2px;
    padding: 0;
    position: relative;
  }
  .stat-details .stat-icon {
    position: absolute;
    left: 0;
    top: 0;
    transform: scale(1) translate(-50%, 0%);
    z-index: 2;
  }
  .stat-details .stat-description {
    background: rgba(0, 137, 215, 0.9);
    box-shadow: 2px 0px 2px rgba(0, 0, 0, 0.45);
    border-radius: 2px;
    color: var(--col-white);
    font-size: 1.2rem;
    font-family: Pixelar, sans-serif;
    line-height: 1.2;
    padding: 0.8rem 0.8rem 0.8rem 1.6rem;
    z-index: 1;
    width: 10rem;
    white-space: nowrap;
    overflow: hidden;
  }
  .stat-details .stat-value {
    margin: 0;
    padding: 0.1rem 0.25rem 0.1rem 0.5rem;
    color: var(--col-white);
    font-size: 2.2rem;
    line-height: 1.2;
    flex: 1 0 30%;
  }
`;
