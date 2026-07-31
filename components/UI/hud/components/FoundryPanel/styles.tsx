import css from 'styled-jsx/css';

export default css`
  .foundry-panel {
    position: fixed;
    left: 12px;
    top: 12px;
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

  .foundry-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .foundry-title {
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #50dce6;
  }

  .foundry-minimize {
    flex: 0 0 auto;
    width: 22px;
    height: 20px;
    padding: 0;
    line-height: 1;
    font-size: 16px;
    font-weight: 700;
    background: #1a2838;
    border: 1px solid #50dce6;
    color: #50dce6;
    cursor: pointer;
  }

  .foundry-minimize:hover {
    background: #243848;
  }

  .foundry-chip {
    position: fixed;
    left: 12px;
    top: 12px;
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: rgba(12, 18, 28, 0.92);
    border: 1px solid rgba(80, 220, 230, 0.45);
    color: #e8f0f8;
    font-family: monospace;
    font-size: 11px;
    cursor: pointer;
    pointer-events: auto;
  }

  .foundry-chip:hover {
    background: rgba(26, 40, 56, 0.95);
  }

  .chip-label {
    color: #50dce6;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .chip-status {
    font-weight: 700;
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

  .recipes {
    margin-top: 10px;
    border-top: 1px solid rgba(80, 220, 230, 0.25);
    padding-top: 8px;
  }

  .recipe {
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px dashed rgba(80, 220, 230, 0.2);
  }

  .recipe-title {
    font-weight: 700;
    color: #50dce6;
  }

  .recipe-desc,
  .recipe-io {
    color: #c0c8d4;
    line-height: 1.35;
    margin: 2px 0 4px;
  }

  .recipe button {
    background: #1a2838;
    border: 1px solid #50dce6;
    color: #e8f0f8;
    font-size: 11px;
    padding: 3px 6px;
    cursor: pointer;
  }

  .mat-group {
    margin-top: 6px;
  }

  .mat-label {
    color: #50dce6;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .mat-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
    color: #c0c8d4;
    font-size: 10px;
  }

  .tier {
    color: #f0c050;
    font-weight: 400;
    font-size: 10px;
  }
`;
