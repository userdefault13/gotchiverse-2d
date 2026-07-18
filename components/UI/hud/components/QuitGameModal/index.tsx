import InputController from 'components/controllers/inputController';
import { Modal } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { useGame } from 'contexts/GameContext';
import { performLogOut } from 'helpers/logout.helper';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useEffect } from 'react';
import styles from './styles';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const QuitGameModal = ({ open, onClose }: Props): JSX.Element => {
  const [{ gameConfig }] = useGame();
  const { back } = useAavegotchiSound();

  useEffect(() => {
    InputController.updateDisableKeyboard(open, true);
  }, [open]);

  const handleExit = () => {
    back();
    onClose();
    performLogOut();
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
