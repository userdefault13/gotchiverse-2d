import { useEffect, useState } from 'react';
import { useRealm } from 'contexts/RealmContext';
import { usePhaser } from 'contexts/PhaserContext';
import { showStarfield } from 'helpers/phaser.helper';
import styles from './styles';
import { ActionButton, ItemShopButton } from '../../elements';
import { CraftIcon, BuildMode, MiniMapIcon, IntroAnimation } from 'assets';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useUI } from 'contexts/UIContexts';
import MapController from 'components/controllers/MapController';
import { postFocusStatus } from 'contexts/UIContexts/actions';
import Image from 'next/image';
import { AccessRightsModal } from '../components/AccessRightsModal';
import {
  HarvesterModal,
  ParcelDashboard,
  NftDisplayModal,
  NotificationStack,
  WithdrawStation,
  ZoomSlider,
  CraftingTable,
  ChatBar,
  ZoneAlert,
  GameAlert,
  ReservoirModal,
  MaakerModal,
  NFTGallery,
  EventModal,
  ActiveEventsModal,
  TravelParcelsModal,
  EventHologram,
  PlayerDashboard,
  ExitArenaModal,
} from '../components';
import { GameNav } from 'components/UI/structures';
import { SuperChatList } from 'components/UI/component/superChat/SuperChatList';
import { DebugConsole } from 'components/UI/component/extras/DebugConsole';
import { ItemShop } from '../components/ItemShop';
import { useGame } from 'contexts/GameContext';

// const LOADED_MAP = MAP_CONFIG_BY_ID[MAP_ID_AARENA];
let countdown;
// const observoorList = [observooor_0, observooor_1, observooor_2, observooor_3, observooor_4, observooor_5, observooor_6];
export const PlayHud = () => {
  const { click, back } = useAavegotchiSound();
  const [{ currentDistrict }] = useRealm();
  const [{ roundTime, minigameIntroAnimation }, phaserDispatch] = usePhaser();
  const [{ gameConfig }] = useGame();

  const [{ inMenu }, uiDispatch] = useUI();

  const [totalTimeLeft, setTotalTimeLeft] = useState(0);
  const [minutes, setMinutes] = useState('00');
  const [seconds, setSeconds] = useState('00');
  const [hours, setHours] = useState('00');
  const [itemShopOpen, setItemShopOpen] = useState(false);

  const [craftTableOpen, setCraftTableOpen] = useState(false);
  useEffect(() => {
    phaserDispatch({
      type: 'UPDATE_ROUND_TIME',
      roundTime: 0,
    });
  }, []);

  useEffect(() => {
    setTotalTimeLeft(roundTime);
    if (countdown) clearInterval(countdown);
    countdown = setInterval(() => {
      setTotalTimeLeft((totalTimeLeft) => totalTimeLeft - 1);
    }, 1000);
  }, [roundTime]);

  useEffect(() => {
    const hours = Math.floor(totalTimeLeft / 3600);
    const minutes = Math.floor((totalTimeLeft - hours * 60) / 60);
    const seconds = totalTimeLeft - minutes * 60;

    // console.log('hours left: ', hours);
    setHours(hours.toString().padStart(2, '0'));
    setMinutes(minutes.toString().padStart(2, '0'));
    setSeconds(seconds.toString().padStart(2, '0'));
    if (totalTimeLeft <= 0) clearInterval(countdown);
  }, [totalTimeLeft]);

  // Effect to detect when the player changes tab/window
  useEffect(() => {
    // User has switched back to the tab
    const onFocus = () => {
      if (!inMenu) postFocusStatus(true, uiDispatch);
    };

    // User has switched away from the tab (AKA tab is hidden)
    const onBlur = () => {
      postFocusStatus(false, uiDispatch);
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    // Calls onFocus when the window first loads
    onFocus();
    // Specify how to clean up after this effect:
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // const getMapPos = (): string => {
  //   let latDir = 'N';
  //   let lat = Number(((playerPosition.y * TILE_SIZE) / LOADED_MAP.HEIGHT) * 90 * 2) - 19;
  //   if (lat > 90) {
  //     lat -= 90;
  //     latDir = 'S';
  //   }
  //   if (latDir === 'N') {
  //     lat = 90 - lat;
  //   }
  //   let longDir = 'W';
  //   let long = Number(((playerPosition.x * TILE_SIZE) / LOADED_MAP.WIDTH) * 90 * 2) - 12;
  //   if (long > 90) {
  //     long -= 90;
  //     longDir = 'E';
  //   }
  //   if (longDir === 'W') {
  //     long = 90 - long;
  //   }
  //   return `${lat.toFixed(1)}°${latDir}, ${long.toFixed(1)}°${longDir} (${playerPosition.x * TILE_SIZE}, ${playerPosition.y * TILE_SIZE}`;
  // };

  // const handleAlchemicaSpillover = (): void => {
  //   click();
  //   Alchemicas.generateTestSpillover();
  // };

  // const zoomUpdated = (event) => {
  //   const element = document.getElementById('zoomButton');
  //   const classToReplace = element?.classList[1];

  //   element?.classList.replace(classToReplace || '', `${event.detail}Button`);

  //   // for (let i = 0; i < classList.length; i++) {
  //   //   const name = String(classList[i]);
  //   //   if (name.includes('zoom')) classList[i] = `${event.detail}Button`;
  //   // }
  //   // element.className = `${event.detail}Button`;
  //   // console.log(element?.className);
  // };

  // const initListeners = () => {
  //   window.addEventListener('zoomUpdated', zoomUpdated);
  //   window.addEventListener('musicUpdated', musicUpdated);
  // };

  const toggleBuildMode = async () => {
    // const isOnParcel = await Installations.toggleBuildMode(true);
    // if (isOnParcel) {
    click();
    uiDispatch({
      type: 'UPDATE_HUD',
      hud: 'BUILD',
    });

    showStarfield(false);
    MapController.toggleMinimap(false);
  };
  const blockPropagation = (e) => e.stopPropagation();

  return (
    <>
      <WithdrawStation />
      <ParcelDashboard />
      <AccessRightsModal />
      <HarvesterModal />
      <ReservoirModal />
      <MaakerModal />
      <ExitArenaModal />
      <NftDisplayModal />
      <EventHologram />
      <ActiveEventsModal />
      <TravelParcelsModal />
      <EventModal />
      <SuperChatList />

      <CraftingTable open={craftTableOpen} onClose={() => setCraftTableOpen(false)} />
      <NotificationStack />
      <ZoneAlert district={currentDistrict} />
      <GameAlert />
      <GameNav />

      {/* <div className="minimap-container" onClick={blockPropagation} onMouseDown={blockPropagation}>
        <div className={'clickable icon'} onClick={handleMapIconClick}>
          <Image alt="" src={MiniMapIcon} />
        </div>
        <div className={`zoom-icons ${toggleMinimap ? 'show' : 'hide'}`}>
          <div className={'clickable icon'} onClick={() => handleMinimapZoom(1)}>
            <Image alt="" src={MiniMapZoomInIcon} />
          </div>
          <div className={'clickable icon'} onClick={() => handleMinimapZoom(-1)}>
            <Image alt="" src={MiniMapZoomOutIcon} />
          </div>
        </div>
      </div> */}

      {/* <div className="top-left-container">
        <div className="settings-menu-container"></div>
        <div className="wallet-menu-container">
          <WalletToggle onClick={() => setWalletModalOpen(true)} address={currentAccount || ''} network={currentNetwork} />
        </div>
      </div> */}

      {/* <div className="top-right-container">
        {selectedPlayer && gotchiUrl && (
          <div className="users-health-container">
            <UsersHealthPanel
              name={selectedPlayer.name}
              health={{ current: health ?? 1000, max: 1000 }}
              hideHealth={isSpectator}
              img={isSpectator ? observoorList[selectedPlayer.spectatorColor] : gotchiUrl.url}
              backgroundColor={backgroundColor}
              isSpectator={isSpectator}
            />
          </div>
        )}

        {!isSpectator && (
          <div className="pending-alchemica-container">
            <CarriedAlchemicaPanel
              alchemica={{
                fud: alchemica?.fud || 0,
                fomo: alchemica?.fomo || 0,
                alpha: alchemica?.alpha || 0,
                kek: alchemica?.kek || 0,
              }}
              maxCapacity={userTraits.alchemicaCarryingCapacity || ALCHEMICA_MAX_CARRY_QUANTITY}
              total={alchemica?.total || 0}
            />
          </div>
        )}
      </div> */}

      <div className="right-container" onClick={blockPropagation} onMouseDown={blockPropagation}>
        <NFTGallery />
      </div>

      <div className={`animations-container ${minigameIntroAnimation ? 'show' : 'hide'}`}>
        <Image alt="" src={minigameIntroAnimation ? IntroAnimation : MiniMapIcon} objectFit="contain" layout="fill" />
      </div>

      <div className="right-middle-container">
        <DebugConsole />
      </div>

      {gameConfig.enableItemShop && (
        <div className={`item-shop-button-container ${itemShopOpen ? 'open' : ''}`}>
          <ItemShopButton open={itemShopOpen} toggle={() => setItemShopOpen(!itemShopOpen)} />
        </div>
      )}

      <div className="right-container" onClick={blockPropagation} onMouseDown={blockPropagation}>
        {itemShopOpen && <ItemShop open={itemShopOpen} onClose={() => setItemShopOpen(false)} />}
      </div>

      <div className="bottom-right-container">
        <ZoomSlider color="purple" />
      </div>
      <div className="action-button-container flex flex-row space-between translate-x-4">
        <ActionButton color="pink" img={CraftIcon} onClick={() => setCraftTableOpen(true)} />
        <ActionButton color="info" img={BuildMode} onClick={toggleBuildMode} disableSound text="BUILD MODE" />
      </div>

      <div className="left-container">
        <div className="chat-bar-container">
          <ChatBar />
        </div>
      </div>

      <div className="bottom-left-container">
        <PlayerDashboard />
      </div>

      {/* {Boolean(totalTimeLeft) && (
        <div className="topContainer">
          <p>{miniGameRoundActive ? 'Time Left: ' + hours + ':' + minutes + ':' + seconds : totalTimeLeft ? 'Next Round: ' + minutes + ':' + seconds : ''}</p>
        </div>
      )} */}

      <style jsx>{styles}</style>
    </>
  );
};

export default PlayHud;
