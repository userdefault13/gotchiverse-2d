import { useEffect, useState } from 'react';
import Head from 'next/head';
import PhaserGameLoader from '../components/utility/PhaserGameLoader';
import { getGameScene } from '../components/phaser/scenes/gameScene';
import router from 'next/router';
import { useWeb3 } from 'contexts/Web3Context';
import { useRealm } from 'contexts/RealmContext';
import { usePhaser } from 'contexts/PhaserContext';
import { LoadingScene } from 'components/UI/sections/loadingScene';
import { useUI } from 'contexts/UIContexts';
import Hud from 'components/UI/hud';
import Installations from 'components/phaser/Installations';
import { MoralisController } from 'components/controllers/moralisController';
import { NFTDisplay } from 'components/phaser/NFTDisplay';
import { fetchAavegotchiURL } from 'helpers/gotchi.helper';
import GameController from 'components/controllers/GameController';

const Play = () => {
  const [{ currentAccount, currentNetwork, globalProvider }] = useWeb3();
  const [{ selectedPlayer, gotchiUrl }, realmDispatch] = useRealm();
  const [{ connected }, phaserDispatch] = usePhaser();
  const [, uiDispatch] = useUI();

  const [eventLocation, setEventLocation] = useState<string>();

  const [gameScene, setGameScene] = useState(undefined);
  const [windowLoaded, setWindowLoaded] = useState(false);
  const [gameLoaded, setGameLoaded] = useState(false);

  // useEffect(() => {
  //   const queryParams = new Proxy(new URLSearchParams(window.location.search), {
  //     get: (searchParams, prop: string) => searchParams.get(prop),
  //   });
  //   // @ts-expect-error
  //   const parcelIdFromUrl = queryParams?.parcelId;
  //   if (parcelIdFromUrl) {
  //     setEventLocation(parcelIdFromUrl);
  //     GameController.updateSpawnId(parcelIdFromUrl);
  //   }
  // }, []);

  useEffect(() => {
    // Ensure Colyseus joins citaadel (not a leftover aarena MAP from /combat).
    GameController.updateMapType('citaadel');
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      setWindowLoaded(true);
      document.body.classList.add('overflow-hidden');
      if (!selectedPlayer && currentNetwork && globalProvider) void getStoredSelectPlayer();
    }
    // clear NFTDisplay modals;
    NFTDisplay.clearNFTDisplay(uiDispatch);

    phaserDispatch({
      type: 'TOGGLE_MINIMAP',
      toggleMinimap: true,
    });

    uiDispatch({
      type: 'UPDATE_HUD',
      hud: 'PLAY',
    });
    Installations.buildModeState = false;
  }, [typeof window, typeof navigator, currentNetwork, globalProvider, currentAccount, selectedPlayer]);

  async function getStoredSelectPlayer(): Promise<void> {
    const gotchiData = await JSON.parse(localStorage.getItem('selectedPlayer'));
    const gotchiExtras = await JSON.parse(localStorage.getItem('gotchiExtras'));
    // console.log('storedgotchiData', gotchiData);
    // console.log('gotchiExtras', gotchiExtras);

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
    if (!gameScene && currentAccount && selectedPlayer && gotchiUrl) {
      setGameScene(getGameScene('citaadel', () => setGameLoaded(true)));
      MoralisController.init();
    }
    setTimeout(() => {
      const allCanvases = document.getElementsByTagName('canvas');
      if (allCanvases?.length > 1) allCanvases[0].remove();
    }, 100);
  }, [currentAccount, selectedPlayer, gotchiUrl]);

  // Reroute if selected player address doesnt match, or network not correct
  useEffect(() => {
    if (
      !['local', 'alpha', 'development'].includes(process.env.APP_ENV) &&
      currentNetwork !== process.env.REALM_NETWORK &&
      currentNetwork !== 'matic' &&
      currentNetwork !== 'base'
    ) {
      const event = eventLocation ? `?routerId=${eventLocation}` : '';
      void router.push('/' + event);
    }
  }, [selectedPlayer, currentAccount, currentNetwork]);

  if (!windowLoaded || !gameScene || !selectedPlayer) return <LoadingScene />;
  return (
    <>
      <Head>
        <title>Play | Gotchiverse</title>
        <meta property="og:title" content="Play | Gotchiverse" key="title" />
      </Head>

      {(!gameLoaded || !selectedPlayer || !connected) && <LoadingScene />}
      {selectedPlayer && <PhaserGameLoader gameScene={gameScene} />}
      {connected && gameLoaded && <Hud />}
    </>
  );
};

export default Play;
