/* eslint-disable multiline-ternary */
import { EffectLayer, LandingStars, LandingDots } from 'assets';
import { Button, SocialLinks } from 'components/UI/elements';
import { Footer, JoinAarena, JoinEvent, Navigation, VideoBanner } from 'components/UI/structures';
import { SpawnOnParcel } from 'components/UI/structures/SpawnOnParcel';
import { useWeb3 } from 'contexts/Web3Context';
import { fetchAndSetGlobalAavegotchis, getSpectator } from 'helpers/gotchi.helper';
import { mapCartridgeHeroToGotchi } from 'helpers/cartridgeHero.helper';
import Image from 'next/image';
import { UpOnlyAavegotchi } from 'assets/images';
import { useEffect, useRef, useState } from 'react';
import styles from './styles';
import { NewsList } from 'components/UI/widgets';
import { GotchiSelectModal } from 'components/UI/screens/section';
import { http } from 'data/actions';
import _ from 'lodash';
import { getAarcadeCartridgeStatus, getIsValidated } from 'helpers/auth.helper';
import GlobalState from 'contexts/GlobalState';
import { gotchiverseLinks } from 'data/links';
import { Parallax } from 'react-scroll-parallax';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import router from 'next/router';
import { GotchiverseAavegotchi } from 'types';
import { useUser } from 'contexts/UserContext';
import { LeaderboardButton } from 'components/UI/elements/buttons/leaderboardButton';
import { useGame } from 'contexts/GameContext';
import { GameConfigPartial } from 'contexts/GameContext/store';
import GameController from 'components/controllers/GameController';
import type { GameConfig } from 'shared_code/types/config.types';

export const LandingScreen = (): JSX.Element => {
  const [{ currentAccount, currentNetwork }] = useWeb3();
  const [bannerIsShort, setBannerIsShort] = useState<boolean>(true);
  const [selectedSpawn, setSelectedSpawn] = useState<string>();
  const [storedPlayerId, setStoredPlayerId] = useState<string>();
  const [selectedGotchi, setSelectedGotchi] = useState<GotchiverseAavegotchi>();
  const [{ userAavegotchis, addresses, cartridgeHeroes }, userDispatch] = useUser();
  const [{ gameConfig }, gameDispatch] = useGame();

  const parcelSection = useRef(null);

  useEffect(() => {
    // load banner video mode

    let mode = localStorage.getItem('bannerVideo');
    if (!mode) mode = 'full';
    setBannerIsShort(mode === 'short');
    document.body.classList.remove('overflow-hidden');
  }, []);

  useEffect(() => {
    void setLastPlayerUsed();
    void handleQueryUpdate(true);
  }, [userAavegotchis, cartridgeHeroes]);

  const setLastPlayerUsed = async () => {
    const storedPlayer = await JSON.parse(localStorage.getItem('selectedPlayer'));
    const gotchiStored = _.find(userAavegotchis, (gotchi) => storedPlayer?.id === gotchi.id);
    const heroStored = _.find(cartridgeHeroes, (hero) => storedPlayer?.id === hero.id);
    setStoredPlayerId(gotchiStored?.id || heroStored?.id || currentAccount);
  };

  useEffect(() => {
    if (currentAccount && userAavegotchis) void handleQueryUpdate();
  }, [router.query]);

  const resolveGotchiFromId = (gotchiId: string): GotchiverseAavegotchi | undefined => {
    if (!gotchiId || !currentAccount) return undefined;
    if (gotchiId.toLowerCase() === currentAccount.toLowerCase()) {
      return getSpectator(currentAccount);
    }
    const owned = _.find(userAavegotchis, (gotchi) => gotchiId === gotchi.id);
    if (owned) return owned;
    const hero = _.find(cartridgeHeroes, (h) => gotchiId === h.id);
    if (hero) return mapCartridgeHeroToGotchi(hero, currentAccount);
    return undefined;
  };

  const handleQueryUpdate = async (init?: boolean) => {
    const queryParams = new Proxy<any>(new URLSearchParams(window.location.search), {
      get: (searchParams, prop: string) => searchParams.get(prop),
    });

    // Soft-launch deep link — stash under this network's gameId only.
    // Ownership / hasCartridge comes from checkCartridge (chain-scoped sim lookup).
    const launchCartridgeId = String(queryParams?.cartridgeId || '').trim();
    if (launchCartridgeId && currentNetwork) {
      const { cartridgeGameIdForNetwork, cartridgeLocalStorageKey } = await import(
        'helpers/cartridgeGameId'
      );
      try {
        localStorage.setItem(
          cartridgeLocalStorageKey(cartridgeGameIdForNetwork(currentNetwork)),
          launchCartridgeId,
        );
      } catch {
        /* ignore */
      }
    }

    const gotchiId = queryParams?.gotchi;
    if (gotchiId) {
      if (gotchiId !== selectedGotchi?.id) {
        const next = resolveGotchiFromId(gotchiId);
        // Keep current selection if roster hasn't loaded yet (avoids closing modal on cAavegotchi click).
        if (next) setSelectedGotchi(next);
      }
    } else setSelectedGotchi(undefined);

    // listen for spawnId query update to select spawn location
    const spawnId = queryParams?.spawnId;
    if (spawnId && spawnId !== 'aarena' && !gotchiId && currentNetwork !== 'robinhood') {
      parcelSection?.current?.scrollIntoView(false);
    }
    if (spawnId !== selectedSpawn) {
      if (!spawnId) {
        setSelectedSpawn(null);
        return;
      }

      setSelectedSpawn(spawnId);
    }

    // listen for eventId query update to select event
    const eventId = queryParams?.eventId;
    if (eventId) {
      const query = { spawnId: eventId, gotchi: storedPlayerId };
      await router.push(
        {
          pathname: '/',
          query,
        },
        undefined,
        { shallow: true, scroll: false },
      );
    }
  };

  const { click } = useAavegotchiSound();
  const isRh = currentNetwork === 'robinhood';

  const setVideoMode = (isShort: boolean) => {
    setBannerIsShort(isShort);
    localStorage.setItem('bannerVideo', isShort ? 'short' : 'full');
  };

  useEffect(() => {
    if (currentNetwork && currentAccount) void fetchAndSetGlobalAavegotchis(true);
  }, [currentNetwork, currentAccount]);

  const handleSpawnSelect = (id: string, isParcel?: boolean) => {
    click();
    // if is not parcel reset list
    if (!isParcel && addresses) {
      userDispatch({
        type: 'UPDATE_PARCELS_ACCESS_OWNERS',
        parcelAccessOwners: addresses,
      });
    }

    const query = { spawnId: id, gotchi: selectedGotchi?.id || storedPlayerId };
    void router.push(
      {
        pathname: '/',
        query,
      },
      undefined,
      { scroll: false },
    );
  };

  const updateGameConfig = async () => {
    try {
      // Probe live smoke tunnels before BFF calls (URLs rotate under the watchdog).
      try {
        const { resolveRealmBaseUrl } = await import('helpers/realm.url');
        await resolveRealmBaseUrl();
      } catch {
        /* soft-fail below */
      }
      const { parsedBody } = await http<{
        data: GameConfig;
      }>('/realm/config/list');
      if (!parsedBody) throw new Error('response is undefined');
      const gameConfig: GameConfigPartial = parsedBody.data;
      if (!gameConfig) return;

      console.log('GAME_CONFIG', gameConfig);
      gameDispatch({
        type: 'UPDATE_GAME_CONFIG',
        // Keep portal open for Colyseus MVP even if server omits isLive.
        // Explicitly pass combatIsLive so JoinAarena unlocks when BFF flips it.
        gameConfig: {
          isLive: true,
          ...gameConfig,
          ...(typeof (gameConfig as { combatIsLive?: boolean }).combatIsLive === 'boolean'
            ? { combatIsLive: (gameConfig as { combatIsLive: boolean }).combatIsLive }
            : {}),
        },
      });
    } catch (err) {
      console.error('@updateGameConfig:API error: ', err);
      // Soft-fail: identity/subgraph can work while REALM BFF is down.
      // Enter Now will surface a clear auth error if the host is still unreachable.
      GameController.handleToastNotification({
        message: 'REALM server unreachable — you can browse gotchis/parcels, but Enter needs the Colyseus host',
        type: 'warn',
      });
      gameDispatch({
        type: 'UPDATE_GAME_CONFIG',
        gameConfig: { isLive: true },
      });
    }
  };

  const fetchActivePlayers = async () => {
    try {
      const { parsedBody } = await http<{
        count: number;
        aarenaCount: number;
        aarenaRhCount?: number;
        citaadelCount: number;
      }>('/users/online', {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!parsedBody) throw new Error('response is undefined');
      gameDispatch({
        type: 'UPDATE_ACTIVE_COUNT',
        activeCount: Number(parsedBody.count) || 0,
      });
      gameDispatch({
        type: 'UPDATE_AARENA_COUNT',
        aarenaCount: Number(parsedBody.aarenaCount) || 0,
      });
      gameDispatch({
        type: 'UPDATE_AARENA_RH_COUNT',
        aarenaRhCount: Number(parsedBody.aarenaRhCount) || 0,
      });
    } catch (err) {
      console.log('api error: ', err);
    }
  };

  useEffect(() => {
    void updateGameConfig();
    void fetchActivePlayers();
    const poll = setInterval(() => void fetchActivePlayers(), 15_000);
    return () => clearInterval(poll);
  }, []);

  const checkValidation = async (address: string) => {
    if (!process.env.APP_ENV || process.env.APP_ENV === 'local' || process.env.APP_ENV === 'alpha' || process.env.APP_ENV === 'development') {
      GlobalState.USER.dispatch({
        type: 'UPDATE_USER_IS_VERIFIED',
        isVerified: true,
      });
      return;
    }
    const res = await getIsValidated(address);
    GlobalState.USER.dispatch({
      type: 'UPDATE_USER_IS_VERIFIED',
      isVerified: res,
    });
  };

  const checkCartridge = async (address: string, network?: string | null) => {
    const net = network || currentNetwork;
    const { cartridgeGameIdForNetwork, cartridgeLocalStorageKey } = await import(
      'helpers/cartridgeGameId'
    );
    const gameId = cartridgeGameIdForNetwork(net);

    // Clear prior chain's cartridge immediately so Base never shows an RH mint.
    const clearPayload = {
      type: 'UPDATE_USER_CARTRIDGE' as const,
      cartridgeId: null as string | null,
      hasCartridge: false,
      cartridgeHeroes: [] as import('helpers/cartridgeHero.helper').CartridgeHero[],
    };
    userDispatch(clearPayload);
    GlobalState.USER?.dispatch?.(clearPayload);

    const status = await getAarcadeCartridgeStatus(address, { fresh: true, network: net });
    if (!status) return;

    const payload = {
      type: 'UPDATE_USER_CARTRIDGE' as const,
      cartridgeId: status.cartridgeId || null,
      hasCartridge: Boolean(status.hasCartridge && status.cartridgeId),
      cartridgeCatalogUrl: status.catalogUrl,
      cartridgeHeroes: status.hasCartridge ? status.heroes || [] : [],
    };
    userDispatch(payload);
    GlobalState.USER?.dispatch?.(payload);

    if (payload.cartridgeId) {
      try {
        localStorage.setItem(cartridgeLocalStorageKey(status.gameId || gameId), payload.cartridgeId);
      } catch {
        /* ignore */
      }
    } else {
      // Drop RH cAavegotchi selection when this chain has no cartridge.
      setSelectedGotchi((prev) => (prev?.isCartridgeHero ? undefined : prev));
    }
  };

  useEffect(() => {
    if (currentAccount) {
      void checkValidation(currentAccount);
      void checkCartridge(currentAccount, currentNetwork);
    }
  }, [currentAccount, currentNetwork]);

  // useEffect(() => {
  //   document.body.style.overflowY = selectedGotchi ? 'clip' : 'auto';
  // }, [selectedGotchi]);

  return (
    <>
      <div className="landing-screen">
        <Navigation />
        <VideoBanner isShort={bannerIsShort} setIsShort={setVideoMode} />

        <main className={`main-content parallax-container  ${bannerIsShort ? 'short' : ''}`}>
          <Parallax speed={-100} style={{ zIndex: -1, position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
            <div className="parallax-layer main-bg"></div>
          </Parallax>
          <div className="absolute">
            <Parallax speed={-50}>
              <Image alt="" src={LandingStars} layout="responsive" />
            </Parallax>
          </div>
          <div className="absolute">
            <Parallax speed={50}>
              <Image alt="" src={LandingDots} layout="responsive" />
            </Parallax>
          </div>

          <div className={`main-container mx-auto grid grid-cols-1 ${isRh ? '' : 'lg:grid-cols-2'} gap-20`}>
            {!isRh && (
              <div className="join-event">
                <JoinEvent handleSpawnSelect={handleSpawnSelect} />
              </div>
            )}
            <div className="starting-point">
              <JoinAarena handleSpawn={handleSpawnSelect} />
              {!isRh && (
                <div className="leaderboard-button-container clickable">
                  <LeaderboardButton
                    onClick={() => {
                      click();
                      void router.push({
                        pathname: '/leaderboard',
                      });
                    }}
                  />
                </div>
              )}
              {!isRh && (
                <div ref={parcelSection} className="parcel-section">
                  <SpawnOnParcel spawnParcelId={selectedSpawn} handleSpawnSelect={handleSpawnSelect} />
                </div>
              )}
            </div>
          </div>

          {!isRh && (
            <div className="blue-bg">
              <div className="news gap-40 w-full flex">
                <NewsList />
                <div className="image-info-container">
                  <div className="img-container">
                    <Image alt="" src={UpOnlyAavegotchi} />
                  </div>
                  <Button size={2.4} fullWidth secondary onClick={() => window.open(gotchiverseLinks.aavegotchi.marketplace, 'new')}>
                    GET AN AAVEGOTCHI
                  </Button>
                </div>
              </div>
              <div className="social">
                <SocialLinks />
              </div>
              <div className="effect-layer">
                <Parallax translateY={[20, -10]}>
                  <Image alt="" src={EffectLayer} layout="responsive" />
                </Parallax>
              </div>
            </div>
          )}
        </main>
        <div className="footer-container">
          <Footer />
        </div>
      </div>
      <GotchiSelectModal
        selectedSpawn={selectedSpawn}
        selectedGotchi={selectedGotchi}
        handleSpawnSelect={handleSpawnSelect}
        onBack={() => {
          const query = { spawnId: router.query.spawnId };
          void router.push(
            {
              pathname: '/',
              query,
            },
            undefined,
            { scroll: false },
          );
          document.body.classList.remove('overflow-hidden');
        }}
      />

      <style jsx>{styles}</style>
    </>
  );
};
