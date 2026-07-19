import css from 'styled-jsx/css';

export default css`
  .foundry-panel {
    position: fixed;
    left: 12px;
    bottom: 96px;
    z-index: 40;
    width: 260px;
    padding: 10px 12px;
    background: rgba(12, 18, 28, 0.88);
    border: 1px solid rgba(80, 220, 230, 0.45);
    color: #e8f0f8;
    font-family: monospace;
    font-size: 12px;
    pointer-events: auto;
  }

  .foundry-title {
    font-weight: 700;
    margin-bottom: 8px;
    letter-spacing: 0.04em;
    color: #50dce6;
  }

  .row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin: 3px 0;
  }

  .hint {
    margin-top: 8px;
    color: #c0c8d4;
    line-height: 1.3;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }

  .actions button {
    background: #1a2838;
    border: 1px solid #50dce6;
    color: #e8f0f8;
    font-size: 11px;
    padding: 4px 6px;
    cursor: pointer;
  }

  .actions button:hover {
    background: #243848;
  }

  .toast {
    margin-top: 8px;
    color: #f0c050;
  }
`;
