/* eslint-disable multiline-ternary */
/* eslint-disable @typescript-eslint/indent */
import { ExitIcon, Logo, MiniMapIcon, MiniMapZoomInIcon, MiniMapZoomOutIcon, PinIcon, QuestionMarkIcon } from 'assets';
import GameController from 'components/controllers/GameController';
import InputController from 'components/controllers/inputController';
import MapController from 'components/controllers/MapController';
import { WalletActivity } from 'components/UI/component';
import { TippingManager } from 'components/UI/component/alchemica/tippingManager';
import { TokenManager } from 'components/UI/component/alchemica/tokenManager';
import { ToggleIcon } from 'components/UI/elements';
import { GotchiPocket, QuitGameModal, SettingsMenu, WalletToggle } from 'components/UI/hud/components';
import { useGame } from 'contexts/GameContext';
import { usePhaser } from 'contexts/PhaserContext';
import { useRealm } from 'contexts/RealmContext';
import { useUI } from 'contexts/UIContexts';
import { useWeb3 } from 'contexts/Web3Context';
import { blockPropagation } from 'helpers/functions';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from './styles';
import { smartTrim } from 'helpers/ethers.helper';
import { MAP_ID_CITAADEL } from 'shared_code/constants/const.game';

export const GameNav = (): JSX.Element => {
  const [{ selectedPlayer, isAavegotchiLent, escrow, currentDistrict, currentParcel }] = useRealm();

  const [{ gameConfig }] = useGame();
  const { click, back } = useAavegotchiSound();
  const [{ currentNetwork, currentAccount }] = useWeb3();
  const isSpectator = selectedPlayer?.isSpectator;

  const [{ toggleMinimap, playerPosition }, phaserDispatch] = usePhaser();
  const [{ inMenu, exitArenaModal }, uiDispatch] = useUI();
  const [tippingManager, setTippingManagerOpen] = useState(false);
  const [manageTokensOpen, setManageTokensOpen] = useState(false);
  const [quitGameModalOpen, setQuitGameModalOpen] = useState(false);

  const [tokenManageMode, setTokenManageMode] = useState<'TRANSFER' | 'ACTIVITY'>('TRANSFER');

  const handleMapIconClick = () => {
    click();
    phaserDispatch({
      type: 'TOGGLE_MINIMAP',
      toggleMinimap: !toggleMinimap,
    });
  };

  useEffect(() => {
    InputController.updateDisableKeyboard(manageTokensOpen, true);
  }, [manageTokensOpen]);

  const closeManagers = () => {
    setTippingManagerOpen(false);
    setTippingManagerOpen(false);
  };

  const handleMinimapZoom = (direction) => {
    click();
    MapController.zoomMiniMap(direction);
  };
  const toggleMode = () => {
    setTokenManageMode(tokenManageMode === 'TRANSFER' ? 'ACTIVITY' : 'TRANSFER');
  };
  return (
    <>
      <QuitGameModal open={quitGameModalOpen} onClose={() => setQuitGameModalOpen(false)} />
      <div className="game-nav-component gradient-purple-simple">
        <div className="content alchemica">
          {/* <div className="logo-wrapper">
            <Image alt="" src={Logo} layout="responsive" />
          </div> */}

          <div className="clickable nav-button flex-c-c ml-5" onClick={handleMapIconClick}>
            <div className="minimap-icon">
              <Image alt="" src={MiniMapIcon} layout="fill" />
            </div>
          </div>

          <div className="wallet-menu-container">
            <WalletToggle onClick={null} address={currentAccount || ''} network={currentNetwork} />
          </div>
          {gameConfig.enableTipping && (
            <>
              <div className="player-wallet-container">
                <TippingManager open={tippingManager} width={'35rem'} size={2} onClose={() => setTippingManagerOpen(false)} />
              </div>

              <div className="nav-button info super-chat-toggle flex-c-c" onClick={() => setTippingManagerOpen(!tippingManager)}>
                <span className="nav-toggle">Super Chat</span>
                <div className="toggle-icon">
                  <ToggleIcon direction={`${tippingManager ? 'up' : 'down'}`} size={1.6} fill={'var(--col-info-200)'} />
                </div>
              </div>
            </>
          )}
          {gameConfig.enablePlayerWallet && (
            <div className={`nav-button token-mananger-container ${manageTokensOpen ? 'open' : ''}`}>
              <div className={`button-wrapper ${!manageTokensOpen ? 'flex-c-c' : 'flex-c-b'}`} onClick={() => setManageTokensOpen(!manageTokensOpen)}>
                <span className="nav-toggle">Manage Tokens</span>
                <div className="toggle-icon">
                  <ToggleIcon
                    direction={`${manageTokensOpen ? 'up' : 'down'}`}
                    size={1.6}
                    fill={!manageTokensOpen ? 'var(--col-purple-250)' : 'var(--col-info-200)'}
                  />
                </div>
              </div>

              <div className="token-manager-wrapper">
                {manageTokensOpen &&
                  (tokenManageMode === 'TRANSFER' ? (
                    <TokenManager onClose={() => setManageTokensOpen(false)} toggle={toggleMode} />
                  ) : (
                    <WalletActivity toggle={toggleMode} />
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="content settings">
          {!isSpectator && GameController.MAP === 'citaadel' && selectedPlayer && isAavegotchiLent && !isSpectator && escrow && <GotchiPocket />}

          {!isSpectator && GameController.MAP === 'aarena' && (
            <div className="icon-toggle flex-c-c" onClick={() => uiDispatch({ type: 'UPDATE_CONTROLLER_GUIDE', controllerGuideOpen: true })}>
              <Image alt="" src={QuestionMarkIcon} width={30} height={30} />
            </div>
          )}

          <div className="settings-menu-container flex-c-c">
            <SettingsMenu />
          </div>
          <button
            type="button"
            className="icon-toggle flex-c-c clickable logout-btn"
            title="Log out"
            aria-label="Log out"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              click();
              if (exitArenaModal.open) return;
              if (GameController.MAP === 'aarena' && selectedPlayer && !selectedPlayer.isSpectator) {
                uiDispatch({
                  type: 'UPDATE_EXIT_ARENA_MODAL',
                  exitArenaModal: {
                    open: true,
                    isDead: false,
                  },
                });
                return;
              }
              setQuitGameModalOpen(true);
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Image alt="" src={ExitIcon} width={30} height={30} />
          </button>
        </div>
      </div>
      <div className={`minimap-container ${toggleMinimap ? 'show' : 'hidden'}`} onClick={blockPropagation} onMouseDown={blockPropagation}>
        <div className="minimap-border"></div>
        <div className="minimap-zoom-controls">
          <div className={'clickable icon'} onClick={() => handleMinimapZoom(1)}>
            <Image alt="" src={MiniMapZoomInIcon} />
          </div>
          <div className="divider" />
          <div className={'clickable icon'} onClick={() => handleMinimapZoom(-1)}>
            <Image alt="" src={MiniMapZoomOutIcon} />
          </div>
        </div>
        {GameController.MAP === MAP_ID_CITAADEL && (
          <div className="location-info">
            {!currentParcel && (
              <div className="flex justify-between align-center">
                <span className="purple"> District {currentDistrict}</span>
                <div className="position flex ">
                  <Image alt="" src={PinIcon} />
                  <span className="global-pos">
                    {playerPosition.x}, {playerPosition.y}
                  </span>
                </div>
              </div>
            )}

            {currentParcel && (
              <div className="parcel-info">
                <div className="parcel-owener flex justify-between align-center purple">
                  <span>Parcel</span>
                  {currentParcel.owner && <span className="parcel-owner-address">{smartTrim(currentParcel.owner, 8)}</span>}
                </div>
                <p className="parcel-hash">{currentParcel.parcelHash}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{styles}</style>
    </>
  );
};
