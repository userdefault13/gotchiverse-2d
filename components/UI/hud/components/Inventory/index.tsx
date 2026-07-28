import _ from 'lodash';
import { Loader, Button } from 'components/UI/elements';
import { useUser } from 'contexts/UserContext';
import { useUI } from 'contexts/UIContexts';
import { setActiveBrush } from 'contexts/UserContext/actions';
import { useState, useRef } from 'react';
import styles from './styles';
import Installations from 'components/phaser/Installations';
import { Installation, InstallationDisabled } from 'types';
import Image from 'next/image';
import { postFocusStatus } from 'contexts/UIContexts/actions';
import { getTypeById, getTypeByItemId } from 'helpers/installations.helper';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { InventoryFilter } from '../InventoryFilter';
import { scene } from 'components/controllers/SceneController';
import { Pointer } from 'assets';
import { InventoryCard } from 'components/UI/component';
import { isLocalOffchainItemId } from 'helpers/lodge.helper';

interface Props {
  isParcel?: boolean;
}

export const Inventory = ({ isParcel = true }: Props): JSX.Element => {
  const [{ inventory, activeBrush }, userDispatch] = useUser();
  const [{ socket }, uiDispatch] = useUI();
  const { back } = useAavegotchiSound();

  const { click, oops } = useAavegotchiSound();
  const [fetching, setFetching] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  function handlePointerDown(installation: Installation, key: number): void {
    if (isDisabled(installation).state) {
      oops();
      return;
    }
    click();
    if (key === activeBrush) {
      Installations.toggleBrush();
      setActiveBrush(undefined, userDispatch);
      return;
    }
    const installationType = getTypeByItemId(installation.id, installation.type === 'INSTALLATION' ? 0 : 1);
    Installations.toggleBrush(installationType);
    setActiveBrush(key, userDispatch);
  }

  // const handleScroll = () => {
  //   scrollRef.current.scrollBy({ top: 164, behavior: 'smooth' });
  // };

  const isDisabled = (installation: Installation): InstallationDisabled => {
    let state = false;
    let reason = !Number(installation.quantity) ? '0 remaining' : 'Outside Parcel!';

    if (!isParcel || !Number(installation.quantity)) return { state: true, reason };

    const parcelInstallations = scene.activeParcel?.installations || [];

    if (installation.type === 'TILE' || installation.itemType === 5 || installation.itemType === 8 || installation.itemType === 7) {
      return {
        state,
      };
    }

    const equippedAaltar = _.filter(parcelInstallations, (id) => {
      return getTypeById(id)?.installationType === 0;
    });

    if (!equippedAaltar.length && installation.itemType !== 0 && !isLocalOffchainItemId(installation.id)) {
      return {
        state: true,
      };
    }

    if (installation.itemType === 0) {
      // aaltar type if we already have an aaltar you can't equip 2.
      if (equippedAaltar.length) {
        state = true;
        reason = 'Placed!';
      }
    }
    if (installation.itemType === 1) {
      const reservoirSameType = _.filter(parcelInstallations, (id) => {
        const type = getTypeById(id);
        return type.installationType === 2 && type.alchemicaType === installation.alchemicaType;
      });
      if (!reservoirSameType.length) {
        return {
          state: true,
        };
      }
    }
    return {
      state,
      reason,
    };
  };

  const togglePlayMode = () => {
    void Installations.toggleBuildMode(false);
    back();
    uiDispatch({
      type: 'UPDATE_HUD',
      hud: 'PLAY',
    });
    uiDispatch({
      type: 'UPDATE_INMENU',
      inMenu: false,
    });
    postFocusStatus(true, uiDispatch);
  };

  return (
    <>
      {fetching && (
        <div className="loading-state">
          <p>Fetching...</p>
          <Loader size={0.15} />
        </div>
      )}
      <div className="content">
        {!fetching && <InventoryFilter setFetching={setFetching} />}
        <div className="divider"></div>
        <div className="scroll-wrapper">
          {isParcel && inventory && inventory.length > 0 && (
            <span className="pointer">
              <Image alt="" src={Pointer} />
            </span>
          )}
          <div className="scroll-cantainer-wrapper scrollable info">
            <div className="scroll-container" ref={scrollRef}>
              {!fetching &&
                inventory?.map((i, key) => {
                  return (
                    i.isVisible && (
                      <div key={key} style={{ boxShadow: 'none' }} className={`shadow ${key === activeBrush ? 'active' : ''}`}>
                        <div
                          key={key}
                          className={`installation-wrapper ${key === activeBrush ? 'active' : ''}`}
                          onPointerDown={() => handlePointerDown(i, key)}
                        >
                          <InventoryCard
                            quantity={i.quantity}
                            installation={{
                              name: i.name,
                              level: i.level,
                              rarity: 'common',
                              type: i.type,
                              itemType: i.itemType,
                              id: i.id,
                            }}
                            isDisabled={isDisabled(i)}
                          />
                        </div>
                      </div>
                    )
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* <div className="scroll-button-div" />
      <button className="scroll-button" onClick={handleScroll}></button> */}
      <div className="exit-button">
        <Button color="info" fullWidth={true} onClick={togglePlayMode} disableSound>
          Exit Build Mode
        </Button>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
