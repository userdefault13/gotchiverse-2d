import InputController from 'components/controllers/inputController';
import { Modal } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { useUserWalletDataContext } from 'components/utility/WalletConnect';
import { useGame } from 'contexts/GameContext';
import { useRealm } from 'contexts/RealmContext';
import { colyseusDisconnect, isColyseusNetcode } from 'helpers/colyseus.client';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useEffect } from 'react';
import styles from './styles';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const QuitGameModal = ({ open, onClose }: Props): JSX.Element => {
  const [{ gameConfig }] = useGame();
  const [, realmDispatch] = useRealm();
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
      localStorage.removeItem('selectedAccount');
      localStorage.removeItem('currentProvider');
    } catch {
      // ignore storage errors
    }

    try {
      realmDispatch({
        type: 'UPDATE_SELECTED_PLAYER',
        selectedPlayer: undefined,
        gotchiUrl: undefined,
        backgroundColor: undefined,
        isAavegotchiLent: undefined,
        escrow: undefined,
        ownedParcels: undefined,
      });
    } catch (err) {
      console.warn('QuitGameModal: clear selected player failed', err);
    }

    try {
      disconnectWallet();
    } catch (err) {
      console.warn('QuitGameModal: wallet disconnect failed', err);
    }

    // Hard navigate so Phaser / socket teardown cannot block leaving play.
    window.location.href = '/';
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
