import { useEffect } from 'react';
import GameController from 'components/controllers/GameController';
import InputController from 'components/controllers/inputController';
import Installations from 'components/phaser/Installations';
import { SpawnSelector } from 'components/UI/sections';
import { useRealm } from 'contexts/RealmContext';
import { useUI } from 'contexts/UIContexts';
import { useUser } from 'contexts/UserContext';
import { useWeb3 } from 'contexts/Web3Context';
import { fetchContractOwnedParcels, mapInGotchiverseParcelData } from 'helpers/parcels.helper';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { PARCELS_BY_ID, PARCELS_BY_TOKEN_ID } from 'shared_code/models/model.realm';
import { getParceIdByTokenId } from 'shared_code/utils/shared.utils.parcel';
import { GotchiverseParcel, Parcel } from 'types';

const toGotchiverseParcel = (parcel: Parcel): GotchiverseParcel => {
  const parcelId = parcel.parcelId || (String(parcel.id || '').charAt(0) === 'C' ? String(parcel.id) : undefined);
  const meta =
    (parcel.tokenId != null && (PARCELS_BY_TOKEN_ID[String(parcel.tokenId)] || PARCELS_BY_TOKEN_ID[Number(parcel.tokenId)])) ||
    (parcelId && PARCELS_BY_ID[parcelId]) ||
    undefined;
  const tokenId = String(parcel.tokenId ?? meta?.tokenId ?? '');
  return {
    ...(parcel as unknown as GotchiverseParcel),
    id: tokenId || parcel.id,
    tokenId: tokenId || undefined,
    parcelId: parcelId || meta?.parcelId,
    parcelHash: parcel.parcelHash || meta?.parcelHash,
    district: (parcel as GotchiverseParcel).district ?? meta?.district,
    owner: parcel.owner,
  };
};

export const TravelParcelsModal = (): JSX.Element => {
  const [{ travelParcelsModal }, uiDispatch] = useUI();
  const [{ currentParcel, ownedParcels: realmParcels }] = useRealm();
  const [{ ownedParcels: userParcels }, userDispatch] = useUser();
  const [{ currentAccount, currentNetwork, globalProvider }] = useWeb3();
  const { click } = useAavegotchiSound();

  const selectedSpawn =
    (currentParcel?.tokenId != null && getParceIdByTokenId(String(currentParcel.tokenId))) ||
    realmParcels?.[0]?.parcelId ||
    '';

  useEffect(() => {
    InputController.updateDisableKeyboard(!!travelParcelsModal.open);
    return () => {
      if (travelParcelsModal.open) InputController.updateDisableKeyboard(false);
    };
  }, [travelParcelsModal.open]);

  useEffect(() => {
    if (!travelParcelsModal.open) return;

    const syncParcels = async () => {
      if (realmParcels?.length) {
        userDispatch({
          type: 'UPDATE_OWNED_PARCELS',
          ownedParcels: realmParcels.map(toGotchiverseParcel),
        });
        return;
      }

      if (userParcels?.length || !currentAccount || !globalProvider) return;

      try {
        const contractParcels = await fetchContractOwnedParcels(currentAccount, globalProvider, currentNetwork);
        const mapped = await mapInGotchiverseParcelData(contractParcels || []);
        userDispatch({
          type: 'UPDATE_OWNED_PARCELS',
          ownedParcels: mapped,
        });
      } catch (err) {
        console.warn('TravelParcelsModal: failed to load parcels', err);
      }
    };

    void syncParcels();
  }, [travelParcelsModal.open, realmParcels, userParcels, currentAccount, globalProvider, currentNetwork, userDispatch]);

  const handleClose = () => {
    uiDispatch({
      type: 'UPDATE_TRAVEL_PARCELS_MODAL',
      travelParcelsModal: { open: false },
    });
  };

  const teleport = (id: string): void => {
    click();
    const parcelId = id?.charAt(0) === 'C' ? id : getParceIdByTokenId(id);
    if (!parcelId) {
      console.warn('TravelParcelsModal: could not resolve parcel for', id);
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

  if (!travelParcelsModal.open) return null;

  return (
    <SpawnSelector type="PARCELS" selectedSpawn={selectedSpawn} onClose={handleClose} handleSelect={(id) => teleport(id)} />
  );
};
