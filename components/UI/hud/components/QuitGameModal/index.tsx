import InputController from 'components/controllers/inputController';
import { Modal } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { useUserWalletDataContext } from 'components/utility/WalletConnect';
import { useGame } from 'contexts/GameContext';
import { colyseusDisconnect, isColyseusNetcode } from 'helpers/colyseus.client';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import Router from 'next/router';
import { useEffect } from 'react';
import styles from './styles';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const QuitGameModal = ({ open, onClose }: Props): JSX.Element => {
  const [{ gameConfig }] = useGame();
  const { back } = useAavegotchiSound();
  const { disconnectWallet } = useUserWalletDataContext();

  useEffect(() => {
    InputController.updateDisableKeyboard(open, true);
  }, [open]);

  const handleExit = () => {
    back();
    onClose();

    try {
      if (isColyseusNetcode()) colyseusDisconnect();
    } catch (err) {
      console.warn('QuitGameModal: colyseus disconnect failed', err);
    }

    try {
      localStorage.removeItem('selectedPlayer');
      localStorage.removeItem('gotchiExtras');
    } catch {
      // ignore storage errors
    }

    try {
      disconnectWallet();
    } catch (err) {
      console.warn('QuitGameModal: wallet disconnect failed', err);
    }

    // Prefer push('/') over back() — play is often opened with replace/empty history.
    void Router.push('/');
  };

  return (
    <>
      <Modal title="Log Out?" open={open} onClose={onClose} secondaryColor>
        <div className="quit-modal-content">
          <p>Leave the game and disconnect your wallet?</p>
          <div className="modal-button-container">
            <Button disableSound secondary onClick={handleExit}>
              Log Out
            </Button>
            <Button color={gameConfig.gotchiverseTheme} onClick={onClose}>
              Resume
            </Button>
          </div>
        </div>
      </Modal>
      <style jsx>{styles}</style>
    </>
  );
};
