import GameController from 'components/controllers/GameController';
import Installations from 'components/phaser/Installations';
import { Modal } from 'components/UI/component';
import { EventList } from 'components/UI/structures';
import { useUI } from 'contexts/UIContexts';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { getParceIdByTokenId } from 'shared_code/utils/shared.utils.parcel';
import styles from './styles';

export const ActiveEventsModal = (): JSX.Element => {
  const [{ activeEventsModal }, uiDispatch] = useUI();
  const { click } = useAavegotchiSound();
  const handleClose = () => {
    uiDispatch({
      type: 'UPDATE_ACTIVE_EVENTS_MODAL',
      activeEventsModal: {
        open: false,
      },
    });
  };
  const teleport = (id: string): void => {
    click();
    // EventList passes bounce-gate parcel tokenId; accept C-* ids too.
    const parcelId = id?.charAt(0) === 'C' ? id : getParceIdByTokenId(id);
    if (!parcelId) {
      console.warn('ActiveEventsModal: could not resolve parcel for', id);
      return;
    }
    GameController.sendData('movement', 'teleport', { parcelId });
    setTimeout(() => {
      void Installations.resetStates();
      uiDispatch({ type: 'UPDATE_NFT_DISPLAY', nftDisplayState: { open: false } });
      uiDispatch({
        type: 'UPDATE_EVENT_HOLOGRAM',
        eventHologramState: { open: false, installationId: undefined },
      });
    }, 50);

    handleClose();
  };
  return (
    <>
      <Modal title="Active Events" open={activeEventsModal.open} onClose={handleClose}>
        <div className="events-wrapper">
          <EventList onSelect={(parcelId) => teleport(parcelId)} />
        </div>
      </Modal>
      <style jsx>{styles}</style>
    </>
  );
};
