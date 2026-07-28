import css from 'styled-jsx/css';

export default css`
  @keyframes slideIn {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(0);
    }
  }

  @keyframes slideOut {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-100%);
    }
  }

  .stack-container {
    position: fixed;
    bottom: 50%;
    left: 0;
    /* Above ModalWrapper (200000) so mint/tx toasts show over select modal */
    z-index: 210000;
    transform: translate(0);
  }

  .notification-container {
    transform: translateX(-100%);
    margin-bottom: .8rem;
  }

  .notification-container.show {
    animation: slideIn 300ms ease-in-out forwards;
  }

  .notification-container.hide {
    animation: slideOut 300ms ease-in-out forwards;
  }
`;
