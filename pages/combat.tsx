import { useEffect, useState } from 'react';
import Head from 'next/head';
import PhaserGameLoader from '../components/utility/PhaserGameLoader';
import { getGameScene } from '../components/phaser/scenes/gameScene';
import router from 'next/router';
import { useWeb3 } from 'contexts/Web3Context';
import { useRealm } from 'contexts/RealmContext';
import { usePhaser } from 'contexts/PhaserContext';
import Hud from 'components/UI/hud';
import { fetchAavegotchiURL } from 'helpers/gotchi.helper';
import GameController from 'components/controllers/GameController';
import { AarenaLobby } from 'components/UI/hud/components';
import { LoadingScene } from 'components/UI/sections';

const Combat = () => {
  const [{ currentAccount, currentNetwork, globalProvider }] = useWeb3();
  const [{ selectedPlayer, gotchiUrl }, realmDispatch] = useRealm();
  const [{ connected, socketConnected }, phaserDispatch] = usePhaser();

  const [gameScene, setGameScene] = useState(undefined);
  const [windowLoaded, setWindowLoaded] = useState(false);

  const [gameLoaded, setGameLoaded] = useState(false);

  useEffect(() => {
    GameController.updateMapType('aarena');
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      setWindowLoaded(true);
      document.body.classList.add('overflow-hidden');
      if (!selectedPlayer && currentNetwork && globalProvider) void getStoredSelectPlayer();
    }

    phaserDispatch({
      type: 'TOGGLE_MINIMAP',
      toggleMinimap: true,
    });
  }, [typeof window, typeof navigator, currentNetwork, globalProvider, currentAccount, selectedPlayer]);

  async function getStoredSelectPlayer(): Promise<void> {
    const gotchiData = await JSON.parse(localStorage.getItem('selectedPlayer'));
    const gotchiExtras = await JSON.parse(localStorage.getItem('gotchiExtras'));
    if (gotchiData === null) {
      void router.push('/');
      return;
    }
    const urls = await fetchAavegotchiURL(gotchiData);
    realmDispatch({
      type: 'UPDATE_SELECTED_PLAYER',
      selectedPlayer: gotchiData,
      gotchiUrl: urls,
      backgroundColor: gotchiExtras.backgroundColor,
      isAavegotchiLent: gotchiExtras.isAavegotchiLent,
      escrow: gotchiData.escrow,
      ownedParcels: gotchiExtras.ownedParcels,
    });
  }

  useEffect(() => {
    if (currentAccount && selectedPlayer && gotchiUrl) {
      setGameScene(getGameScene('aarena', () => setGameLoaded(true)));

      setTimeout(() => {
        const allCanvases = document.getElementsByTagName('canvas');
        if (allCanvases?.length > 1) allCanvases[0].remove();
      }, 100);
    }
  }, [currentAccount, selectedPlayer, gotchiUrl]);

  // Reroute if selected player address doesnt match, or network not correct
  useEffect(() => {
    if (
      !['local', 'alpha', 'development'].includes(process.env.APP_ENV) &&
      currentNetwork !== process.env.REALM_NETWORK &&
      currentNetwork !== 'matic' &&
      currentNetwork !== 'base' &&
      currentNetwork !== 'robinhood' &&
      currentNetwork !== 'bitcoin'
    ) {
      void router.push('/');
    }
  }, [selectedPlayer, currentAccount, currentNetwork]);

  if (!windowLoaded || !gameScene) return <LoadingScene isAarena />;
  return (
    <>
      <Head>
        <title>Aarena | Gotchiverse</title>
        <meta property="og:title" content="Aarena | Gotchiverse" key="title" />
      </Head>
      {/* Once the scene has loaded, never cover it with the boot LoadingScene on a
          transient Colyseus disconnect — that looked like "attack → stuck loading". */}
      {(!gameLoaded || !selectedPlayer) && <LoadingScene isAarena />}
      {selectedPlayer && <PhaserGameLoader gameScene={gameScene} />}
      {connected && gameLoaded && <Hud />}
      {gameLoaded && socketConnected && <AarenaLobby />}
    </>
  );
};

export default Combat;
