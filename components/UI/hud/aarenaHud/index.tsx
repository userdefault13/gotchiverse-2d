import styles from './styles';
import { useEffect, useState } from 'react';
import { usePhaser } from 'contexts/PhaserContext';
import { useUI } from 'contexts/UIContexts';
import { postFocusStatus } from 'contexts/UIContexts/actions';

import { NotificationStack, ZoomSlider, GameAlert, ChatBar, ExitArenaModal, PlayerDashboard } from '../components';
import { GameNav } from 'components/UI/structures';
import { ControllGuide } from '../components/ControllerGuide';
import { SuperChatList } from 'components/UI/component/superChat/SuperChatList';
import { ItemShop } from '../components/ItemShop';
import { blockPropagation } from 'helpers/functions';
import { ItemShopButton } from 'components/UI/elements';
import { useGame } from 'contexts/GameContext';
import { DebugConsole } from 'components/UI/component/extras/DebugConsole';
import { useRealm } from 'contexts/RealmContext';
import { Leaderboard } from '../components/Leaderboard';
import { RhStockPrizePanel } from '../components/RhStockPrizePanel';

export const AarenaHUD = () => {
  const [, phaserDispatch] = usePhaser();
  const [{ selectedPlayer }] = useRealm();
  const [{ inMenu }, uiDispatch] = useUI();
  const [{ gameConfig }, gameDispatch] = useGame();
  const [itemShopOpen, setItemShopOpen] = useState(false);

  useEffect(() => {
    phaserDispatch({
      type: 'UPDATE_ROUND_TIME',
      roundTime: 0,
    });
  }, []);

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

  // const initListeners = () => {
  //   window.addEventListener('zoomUpdated', zoomUpdated);
  //   window.addEventListener('musicUpdated', musicUpdated);
  // };

  return (
    <>
      <NotificationStack />
      <RhStockPrizePanel />
      <ExitArenaModal />
      <GameAlert />
      <GameNav />
      <SuperChatList />

      <div className="left-container">
        <div className="chat-bar-container">
          <ChatBar />
        </div>
      </div>
      <div className="bottom-right-container">
        <ZoomSlider color="purple" />
      </div>

      <div className={`item-shop-button-container ${itemShopOpen ? 'open' : ''}`}>
        {gameConfig.enableItemShop && !selectedPlayer?.isSpectator && (
          <ItemShopButton open={itemShopOpen} toggle={() => setItemShopOpen(!itemShopOpen)} />
        )}
      </div>

      {!selectedPlayer?.isSpectator && (
        <div>
          <Leaderboard layout="ingame" />
        </div>
      )}

      <div className="right-container" onClick={blockPropagation} onMouseDown={blockPropagation}>
        {itemShopOpen && <ItemShop open={itemShopOpen} onClose={() => setItemShopOpen(false)} />}
      </div>

      <div className="right-middle-container">
        <DebugConsole />
      </div>

      <div className="bottom-left-container">
        <PlayerDashboard />
      </div>
      <ControllGuide />

      <style jsx>{styles}</style>
    </>
  );
};

export default AarenaHUD;
