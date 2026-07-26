/* eslint-disable @typescript-eslint/indent */
/* eslint-disable multiline-ternary */
import { useEffect, useMemo, useState, useCallback } from 'react';
import styles from './styles';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useWeb3 } from 'contexts/Web3Context';
import { CloseIcon } from 'components/UI/elements';
import {
  GotchiSelectPanel,
  GotchiDetailsPanel,
  CartridgeMintPanel,
  CollateralGotchiGallery,
} from 'components/UI/screens/section';
import { ContractParcel, GotchiverseAavegotchi, GotchiverseParcel, JsonParcel, Parcel, RealmEvent } from 'types';
import { fetchAavegotchiURL, setAavegtochiToLocalStorage, getGotchiData, isTrueSpectator, brsToRarity } from 'helpers/gotchi.helper';
import { useRealm } from 'contexts/RealmContext';
import useResizeObserver from 'hooks/useResizeObserver';
import router from 'next/router';
import { toast } from 'react-toastify';
import { collateralByAddress, getMintableCollaterals, type CollateralObject } from 'helpers/ethers.helper';
import { fetchCartridgeHeroSideSVGs, fetchCollateralGotchiBlobUrl } from 'helpers/collateralPreview';
import { convertInlineSVGToBlobURL } from 'helpers/aavegotchi';
import { useUser } from 'contexts/UserContext';
import { bindAarcadeStarter, ensureAarcadeCartridge, getAarcadeCartridgeStatus } from 'helpers/auth.helper';
import {
  collateralFromSimId,
  heroesFromCartridgeSnapshot,
  mapCartridgeHeroToGotchi,
  type CartridgeHero,
} from 'helpers/cartridgeHero.helper';
import { GotchiverseBaseCartridge, GotchiverseRhCartridge } from 'assets';
import {
  fetchContractOwnedParcels,
  getParcelAccessRights,
  getParcelsAccessRightsWhitelistIds,
  mapInGotchiverseParcelData,
  transformParcelFormat,
} from 'helpers/parcels.helper';
import Image from 'next/image';
import GameController from 'components/controllers/GameController';
import _ from 'lodash';
import { GotchiSVG, MaticNeeded } from 'components/UI/widgets';
import { PARCELS_BY_TOKEN_ID } from 'shared_code/models/model.realm';
import { ClosedPortal, GotchiLoading, GotchiverseLogo, LastPositionNoBgIcon, PortalLightningBg } from 'assets';
import { useGame } from 'contexts/GameContext';
import { SpawnLocation } from 'components/UI/structures/SpawnLocation';
import { SpawnSelector } from 'components/UI/sections';
import useMediaQuery from 'hooks/useMediaQuery';
import { BasePanel, ModalWrapper } from 'components/UI/component';
import { ChannelReadyToggle } from 'components/UI/elements/buttons/channelReadyToggle';
import { EnterButton } from 'components/UI/structures/EnterButton';

interface Props {
  selectedSpawn: string;
  handleSpawnSelect: (id: string) => void;
  onBack: () => void;
  selectedGotchi: GotchiverseAavegotchi;
}

export const GotchiSelectModal = ({ selectedSpawn, selectedGotchi, handleSpawnSelect, onBack }: Props): JSX.Element => {
  const [{ currentAccount, currentNetwork, globalProvider, ethersSigner }] = useWeb3();
  const [{ eventsList }, realmDispatch] = useRealm();
  const [{ gameConfig }] = useGame();
  const [{ hasCartridge }, userDispatch] = useUser();

  const { portalOpen, sending } = useAavegotchiSound();

  // TODO: GAME_CONFIG.demoGotchiMode should be pulled from the API before page load and not start with the the default constant version here
  const [storedId, setStoredId] = useState<string>();
  const [enterPortal, setEnterPortal] = useState(false);
  const [parcel, setParcel] = useState<JsonParcel>(null);
  const [event, setEvent] = useState<RealmEvent>();
  const [entering, setEntering] = useState(false);
  const [spawnSelectorOpen, setSpawnSelectorOpen] = useState(false);
  const [isEvent, setIsEvent] = useState(false);
  /** `cartridge` = details/price/mint CTA; `caavegotchi` = collateral gallery after mint */
  const [mintStep, setMintStep] = useState<'cartridge' | 'caavegotchi' | null>(null);
  const [selectedCollateral, setSelectedCollateral] = useState<CollateralObject | null>(null);
  const [selectedWalletGotchi, setSelectedWalletGotchi] = useState<GotchiverseAavegotchi | null>(null);
  const [manageHero, setManageHero] = useState<GotchiverseAavegotchi | null>(null);
  const [collateralPreviewUrl, setCollateralPreviewUrl] = useState<string | null>(null);
  /** 4-side blob URLs for cAavegotchi enter anim (index 3 = back). */
  const [cartridgeSideUrls, setCartridgeSideUrls] = useState<[string, string, string, string] | null>(null);
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const mintMode = mintStep !== null;
  const cartridgeArt = currentNetwork === 'robinhood' ? GotchiverseRhCartridge : GotchiverseBaseCartridge;
  const selectedIsCartridgeHero = Boolean(selectedGotchi?.isCartridgeHero);

  const previewCollateral = useMemo(() => {
    if (mintStep === 'caavegotchi' && selectedCollateral) return selectedCollateral;
    if (selectedIsCartridgeHero) return collateralFromSimId(selectedGotchi?.cartridgeCollateral);
    return null;
  }, [mintStep, selectedCollateral, selectedIsCartridgeHero, selectedGotchi?.cartridgeCollateral]);

  useEffect(() => {
    let cancelled = false;
    if (!previewCollateral) {
      setCollateralPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setCartridgeSideUrls((prev) => {
        if (prev) prev.forEach((u) => URL.revokeObjectURL(u));
        return null;
      });
      return;
    }
    void fetchCollateralGotchiBlobUrl(previewCollateral, currentNetwork).then((url) => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      setCollateralPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    });
    // Prefetch all sides so enter-portal can flip to back view immediately.
    void fetchCartridgeHeroSideSVGs(previewCollateral, currentNetwork).then((sides) => {
      if (cancelled) return;
      const urls = sides.map((svg) => convertInlineSVGToBlobURL(svg)) as [string, string, string, string];
      setCartridgeSideUrls((prev) => {
        if (prev) prev.forEach((u) => URL.revokeObjectURL(u));
        return urls;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [previewCollateral, currentNetwork]);

  const syncCartridgeFromResult = async (result: {
    cartridgeId?: string;
    gameId?: string;
    heroes?: CartridgeHero[];
    cartridge?: unknown;
  }) => {
    let heroes = result.heroes;
    if ((!heroes || heroes.length === 0) && result.cartridge) {
      heroes = heroesFromCartridgeSnapshot(result.cartridge);
    }
    if ((!heroes || heroes.length === 0) && currentAccount) {
      const status = await getAarcadeCartridgeStatus(currentAccount, {
        fresh: true,
        network: currentNetwork,
      });
      if (status?.heroes) heroes = status.heroes;
    }
    userDispatch({
      type: 'UPDATE_USER_CARTRIDGE',
      cartridgeId: result.cartridgeId,
      hasCartridge: true,
      cartridgeHeroes: heroes || [],
    });
    if (result.cartridgeId) {
      try {
        const { cartridgeGameIdForNetwork, cartridgeLocalStorageKey } = await import(
          'helpers/cartridgeGameId'
        );
        const gameId = result.gameId || cartridgeGameIdForNetwork(currentNetwork);
        localStorage.setItem(cartridgeLocalStorageKey(gameId), result.cartridgeId);
      } catch {
        /* ignore */
      }
    }
    return heroes || [];
  };

  const selectedGotchiRarity = useMemo(() => {
    if (!selectedGotchi) return 'disabled';
    return brsToRarity(Number(selectedGotchi.baseRarityScore));
  }, [selectedGotchi]);

  useEffect(() => {
    if (selectedGotchi) document.body.classList.add('overflow-hidden');
    else document.body.classList.remove('overflow-hidden');

    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [selectedGotchi]);

  const isDesktop = useMediaQuery('(min-width: 1200px), (min-height: 750px)');
  const selectedGotchiHeight = useMemo(
    () =>
      selectedGotchi
        ? isDesktop
          ? isTrueSpectator(selectedGotchi.isSpectator)
            ? 30
            : 42
          : isTrueSpectator(selectedGotchi.isSpectator)
          ? 30
          : 36
        : 0,
    [isDesktop, selectedGotchi],
  );

  const checkIsEvent = (spawnId: string): boolean => {
    return spawnId && spawnId[0] !== 'C' && spawnId !== 'aarena';
  };

  useEffect(() => {
    if (!selectedSpawn) return;
    const _isEvent = checkIsEvent(selectedSpawn);
    setIsEvent(_isEvent);
    if (!_isEvent) {
      void fetchParcelData();
    } else {
      setEvent(eventsList.find((event) => event.id === selectedSpawn));
    }
  }, [selectedSpawn, eventsList]);

  // useEffect(() => {
  //   setSpawnLocation(selectedSpawn);
  // }, [selectedSpawn]);

  const fetchParcelData = async () => {
    const parcelData: JsonParcel = _.find(PARCELS_BY_TOKEN_ID, (val: JsonParcel) => val.parcelId === selectedSpawn);
    setParcel(parcelData);
  };

  const getAndSignNonce = async function (signer, address, gotchiId?: string) {
    let apiUrl: string;
    try {
      const { resolveRealmBaseUrl } = await import('helpers/realm.url');
      apiUrl = await resolveRealmBaseUrl(true);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      toast.error(`REALM unreachable. ${detail}`, { theme: 'dark' });
      throw err;
    }
    let nonceResponse: Response;
    try {
      const { realmFetchHeaders } = await import('helpers/realm.url');
      nonceResponse = await fetch(`${apiUrl}/user/nonce/get?address=${address}`, {
        headers: realmFetchHeaders(apiUrl),
      });
    } catch (err) {
      toast.error(`REALM unreachable at ${apiUrl}. Tunnel/watchdog may be down — retry Enter shortly.`, {
        theme: 'dark',
      });
      throw err;
    }
    if (nonceResponse.status !== 200) {
      toast.error(`REALM auth failed (${nonceResponse.status}). Is ${apiUrl}/health up?`, { theme: 'dark' });
      throw new Error(`An error occurred when fetching the nonce: ${nonceResponse.statusText}`);
    }
    const nonceData = await nonceResponse.json();
    const nonce = nonceData.nonce || nonceData.data?.nonce;
    if (!nonce) {
      toast.error('REALM returned no nonce', { theme: 'dark' });
      throw new Error('Missing nonce from REALM');
    }
    const signed = await signer.signMessage(nonce);

    const gotchiQuery = gotchiId ? `&gotchiId=${gotchiId}` : '';
    const tokenResponse = await fetch(
      `${apiUrl}/user/authtoken/get?address=${address}&signature=${signed}${gotchiQuery}`,
      { headers: (await import('helpers/realm.url')).realmFetchHeaders(apiUrl) },
    );
    if (tokenResponse.status !== 200) {
      toast.error('The signature of the message is invalid', { theme: 'dark' });
      throw new Error(`An error occurred when validating the signed nonce: ${tokenResponse.statusText}`);
    }
    const tokenData = await tokenResponse.json();
    console.log('tokenData', tokenData);
    const token = tokenData.token || tokenData.authToken || tokenData.data?.token || tokenData.data?.authToken;
    if (!token) {
      toast.error('REALM returned no auth token', { theme: 'dark' });
      throw new Error('Missing auth token from REALM');
    }
    localStorage.setItem('authToken', token);
  };

  const resetMintFlow = () => {
    setMintStep(null);
    setSelectedCollateral(null);
    setSelectedWalletGotchi(null);
    setMintError(null);
  };

  const enterCaavegotchiStep = () => {
    setMintError(null);
    setMintStep('caavegotchi');
    setSelectedCollateral((prev) => prev || getMintableCollaterals()[0] || null);
  };

  const handleGotchiSelect = (gotchi: GotchiverseAavegotchi) => {
    if (gotchi) {
      resetMintFlow();
      void router.push(
        {
          pathname: '/',
          query: { ...router.query, gotchi: gotchi.id },
        },
        undefined,
        { scroll: false },
      );
    }
  };

  const handleMintCartridgeClick = () => {
    if (entering || minting) return;
    setMintError(null);
    // Already minted → skip details and show cAavegotchi picker
    if (hasCartridge) {
      enterCaavegotchiStep();
      return;
    }
    setSelectedCollateral(null);
    setMintStep('cartridge');
  };

  const handleEnsureCartridge = async () => {
    if (minting || !currentAccount) {
      if (!currentAccount) {
        setMintError('Connect a wallet to mint');
        toast.error('Connect a wallet to mint', { theme: 'dark' });
      }
      return;
    }
    setMinting(true);
    setMintError(null);
    try {
      const result = await ensureAarcadeCartridge(currentAccount, { network: currentNetwork });
      if (!result.ok || !result.cartridgeId) {
        const msg = result.error || 'Mint failed';
        setMintError(msg);
        toast.error(msg, { theme: 'dark' });
        return;
      }
      await syncCartridgeFromResult(result);
      toast.success(result.alreadyBound ? 'Cartridge ready' : 'Cartridge minted — pick a cAavegotchi', {
        theme: 'dark',
      });
      enterCaavegotchiStep();
    } finally {
      setMinting(false);
    }
  };

  const handleBindStarter = async () => {
    if (minting || !selectedCollateral || !currentAccount) {
      if (!currentAccount) {
        setMintError('Connect a wallet to bind');
        toast.error('Connect a wallet to bind', { theme: 'dark' });
      }
      return;
    }
    setMinting(true);
    setMintError(null);
    try {
      // $5 USDC sim not live — bind still runs without charge.
      const result = await bindAarcadeStarter(currentAccount, selectedCollateral.name, {
        network: currentNetwork,
      });
      if (!result.ok || !result.cartridgeId) {
        const msg = result.error || 'Bind failed';
        setMintError(msg);
        toast.error(msg, { theme: 'dark' });
        return;
      }
      const heroes = await syncCartridgeFromResult(result);
      toast.success(
        result.alreadyBound
          ? 'cAavegotchi already bound'
          : `Bound ${selectedCollateral.maticDisplay || selectedCollateral.name} ($5 USDC sim — not charged)`,
        { theme: 'dark' },
      );
      resetMintFlow();
      const bound =
        heroes.find((h) => h.collateral === result.collateral) ||
        heroes[heroes.length - 1] ||
        null;
      if (bound) {
        handleGotchiSelect(mapCartridgeHeroToGotchi(bound, currentAccount));
      }
    } finally {
      setMinting(false);
    }
  };

  /** Owners & borrowers: ensure cartridge, then enter as the wallet gotchi (free). */
  const handleMintWalletGotchi = async () => {
    if (minting || !selectedWalletGotchi || !currentAccount) {
      if (!currentAccount) {
        setMintError('Connect a wallet to mint');
        toast.error('Connect a wallet to mint', { theme: 'dark' });
      }
      return;
    }
    setMinting(true);
    setMintError(null);
    try {
      if (!hasCartridge) {
        const result = await ensureAarcadeCartridge(currentAccount, { network: currentNetwork });
        if (!result.ok || !result.cartridgeId) {
          const msg = result.error || 'Mint failed';
          setMintError(msg);
          toast.error(msg, { theme: 'dark' });
          return;
        }
        await syncCartridgeFromResult(result);
      }
      const role = selectedWalletGotchi.isLent ? 'borrower' : 'owner';
      toast.success(`Free mint ready (${role}) — #${selectedWalletGotchi.id}`, { theme: 'dark' });
      const gotchi = selectedWalletGotchi;
      resetMintFlow();
      handleGotchiSelect(gotchi);
    } finally {
      setMinting(false);
    }
  };

  const handleGameStart = async (isLast?: boolean) => {
    if (entering) return;
    if (selectedGotchi) {
      setEntering(true);
      if (selectedSpawn) {
        if (selectedSpawn === 'aarena') GameController.updateMapType('aarena');
        else {
          let spawnLocId;
          if (isEvent) {
            const evt = eventsList.find((event) => event.id === selectedSpawn);
            if (!evt) {
              console.log('EVENT NOT FOUND FOR ID:', selectedSpawn);
            } else {
              spawnLocId = evt.parcelId;
            }
          } else {
            spawnLocId = selectedSpawn;
          }
          GameController.updateSpawnId(!isLast ? spawnLocId : undefined);
          GameController.updateMapType('citaadel');
        }
      }
      try {
        if (gameConfig.requireMetaMaskSign) {
          sending();
          await getAndSignNonce(ethersSigner, currentAccount, selectedGotchi?.id);
        }
        await setGlobalSelectedPlayer(selectedGotchi);
        void enterRealm();
      } catch (e) {
        setEntering(false);
        console.error('@handleGameStart', e);
      }
    }
  };

  const setGlobalSelectedPlayer = async (gotchi) => {
    const playerObject = getGotchiData(gotchi, currentNetwork, currentAccount, gameConfig.demoGotchiMode);
    const urls = await fetchAavegotchiURL(playerObject);
    const backgroundColor = gotchi.isCartridgeHero
      ? collateralFromSimId(gotchi.cartridgeCollateral)?.secondaryColor || '#516C51'
      : collateralByAddress(currentNetwork, gotchi.collateral)?.secondaryColor || '#516C51';
    const isAavegotchiLent = gotchi.isLent;
    let lenderParcels: ContractParcel[] = [];
    let ownedParcels = await fetchContractOwnedParcels(currentAccount, globalProvider, currentNetwork);
    _.map(ownedParcels, (parcel) => _.assign(parcel, { owner: currentAccount }));

    if (isAavegotchiLent && (currentNetwork === 'matic' || currentNetwork === 'base')) {
      lenderParcels = await fetchContractOwnedParcels(gotchi.originalOwner.id, globalProvider, currentNetwork);
      playerObject.originalOwner = gotchi.originalOwner.id;
      // Get permissions for parcels of lended gotchi
      const parcelIds = _.map(lenderParcels, (parcel) => parcel.tokenId);
      // since we are currently limiting the number of parcels fetched here and we want to guarantee we load rights
      // for the selected parcel, verify the selected spawn point was a parcel
      if (selectedSpawn?.charAt(0) === 'C') {
        // convert selected parcel ID into it's tokenId equivalent
        const parcelData: JsonParcel = _.find(PARCELS_BY_TOKEN_ID, (val: JsonParcel) => val.parcelId === selectedSpawn);
        if (parcelData && !parcelIds.includes(parcelData.tokenId)) {
          // and if it wasn't already in the list to look up access rights, add it
          parcelIds.push(parcelData.tokenId);
          // add it to lenderParcels as required below as well, convert to ContractParcel type
          const contractParcel: ContractParcel = _.assign({}, _.pick(parcelData, ['tokenId', 'parcelHash', 'parcelId']), {
            id: parcelData.tokenId,
            district: String(parcelData.district),
          });
          lenderParcels.push(contractParcel);
        }
      }
      const accessRights = await getParcelAccessRights(parcelIds, currentNetwork, globalProvider);
      console.log('accessRights', accessRights);
      const accessWhitelists = await getParcelsAccessRightsWhitelistIds(parcelIds, currentNetwork, globalProvider, true);
      console.log('accessWhitelists', accessWhitelists);
      _.map(lenderParcels, (parcel, i) =>
        _.assign(parcel, { owner: gotchi.originalOwner.id, accessRights: accessRights[i], accessWhitelists: accessWhitelists?.[i] }),
      );
      ownedParcels = _.concat(ownedParcels, lenderParcels);
      console.log('ownedParcels', ownedParcels);
    }

    const gotchiverseParcels: GotchiverseParcel[] = await mapInGotchiverseParcelData(ownedParcels);
    const transformedParcels: Parcel[] = transformParcelFormat(gotchiverseParcels);
    setAavegtochiToLocalStorage(playerObject, backgroundColor, isAavegotchiLent, transformedParcels);
    console.log('gotchiverseParcels', gotchiverseParcels);
    realmDispatch({
      type: 'UPDATE_SELECTED_PLAYER',
      selectedPlayer: playerObject,
      gotchiUrl: urls,
      backgroundColor,
      isAavegotchiLent,
      escrow: gotchi.escrow,
      ownedParcels: transformedParcels,
    });
  };

  const enterRealm = async () => {
    setEnterPortal(true);
    portalOpen();
    setTimeout(() => {
      void router.push(GameController.getGameRoute());
    }, 2500);
  };

  const [placeholderCount, setPlaceholderCount] = useState<number>(12);
  const onResize = useCallback((target: HTMLDivElement) => {
    // Handle the resize event to update the count of placeholder items
    const { width, height } = target.getBoundingClientRect();
    let totalCount = 0;
    const maxBounds = {
      width: 1125,
      height: 800,
    };
    const minBounds = {
      width: 375,
      height: 600,
    };
    if (width < minBounds.width || height < minBounds.height) {
      totalCount = 7;
    } else if (width > maxBounds.width || height > maxBounds.height) {
      totalCount = 13;
    } else {
      totalCount = 13;
    }
    setPlaceholderCount(Math.max(totalCount - 1, 0));
  }, []);
  const containerRef = useResizeObserver(onResize);

  return (
    <>
      <ModalWrapper
        open={!!selectedGotchi}
        onClose={() => {
          !entering && onBack();
        }}
      >
        <div className="gotchi-select-modal not-clickable" onClick={(e) => e.stopPropagation()}>
          <div className="bg-container">
            <span className="bg-img">
              <Image alt="" src={PortalLightningBg} layout="fill" objectFit="cover" />
            </span>
            <MaticNeeded />
            <div className="close-button-container clickable" onClick={onBack}>
              <CloseIcon fill="var(--col-white)" size="3.5rem" big />
            </div>
            <div className="mobile-view">
              <Image alt="" src={GotchiverseLogo} className="mobile-logo" />
              <BasePanel
                title="Not Supported"
                inherit={{
                  width: true,
                  height: true,
                }}
                content={{
                  padding: 16,
                }}
              >
                <br />
                <p>The Gotchiverse is currently not supported on Mobile.</p>
                <p>Stay tuned to be alerted when Gotchiverse mobile is available</p>
              </BasePanel>
            </div>
            <div className="desktop-view" ref={containerRef}>
              <GotchiSelectPanel
                placeholderCount={placeholderCount}
                handleSelect={(gotchi) => {
                  if (entering) return;
                  handleGotchiSelect(gotchi);
                }}
                selectedId={selectedGotchi?.id}
                storedId={storedId}
                mintMode={mintMode}
                mintStep={mintStep}
                onMintCartridgeClick={handleMintCartridgeClick}
                onManageCaavegotchiClick={(gotchi) => {
                  if (entering) return;
                  setManageHero(gotchi);
                }}
              />

              {/* <div className="back_menu">
                  <Button onClick={() => onBack()} fullWidth>
                    {'< BACK TO MENU'}
                  </Button>
                </div> */}

              {!gameConfig.isLive || !currentNetwork || !globalProvider ? (
                <div className="portal closed">
                  <Image alt="" src={ClosedPortal} objectFit="contain" layout="fill" />
                </div>
              ) : null}

              {mintStep === 'cartridge' && currentNetwork && globalProvider && (
                <div className="selected-gotchi-container mint-preview">
                  <div className="gotchi">
                    <div
                      className="cartridge-preview-img"
                      style={{ width: `${selectedGotchiHeight}rem`, height: `${selectedGotchiHeight}rem`, position: 'relative' }}
                    >
                      <Image alt="Gotchiverse cartridge" src={cartridgeArt} layout="fill" objectFit="contain" />
                    </div>
                  </div>
                  <div className="glow"></div>
                  <div className="gotchi-name-container">
                    <div className="gotchi-name">
                      <h4>Gotchiverse Cartridge</h4>
                    </div>
                    <p className="gotchi-caption">Soft launch · Free mint</p>
                  </div>
                </div>
              )}

              {mintStep === 'caavegotchi' && currentNetwork && globalProvider && (
                <div className="selected-gotchi-container mint-preview">
                  <div className="gotchi">
                    {selectedWalletGotchi ? (
                      <GotchiSVG
                        tokenId={selectedWalletGotchi.id}
                        side={0}
                        options={{ removeBg: true, animate: true }}
                        height={selectedGotchiHeight}
                      />
                    ) : (
                      <div
                        className="collateral-preview-svg"
                        style={{
                          width: `${selectedGotchiHeight}rem`,
                          height: `${selectedGotchiHeight}rem`,
                          position: 'relative',
                        }}
                      >
                        <Image
                          alt=""
                          src={collateralPreviewUrl || GotchiLoading}
                          layout="fill"
                          objectFit="contain"
                          unoptimized={!!collateralPreviewUrl}
                        />
                      </div>
                    )}
                  </div>
                  <div className="glow"></div>
                  <div className="gotchi-name-container">
                    <div className="gotchi-name">
                      <h4>
                        {selectedWalletGotchi
                          ? selectedWalletGotchi.name || `#${selectedWalletGotchi.id}`
                          : selectedCollateral
                            ? selectedCollateral.maticDisplay || selectedCollateral.name
                            : 'cAavegotchi'}
                      </h4>
                    </div>
                    <p className="gotchi-caption">
                      {selectedWalletGotchi
                        ? selectedWalletGotchi.isLent
                          ? 'Wallet gotchi · Free mint (borrower)'
                          : 'Wallet gotchi · Free mint (owner)'
                        : selectedCollateral
                          ? 'Base traits 50 · ES 50 · EC 50 · $5 USDC (sim)'
                          : 'Choose collateral or a wallet gotchi →'}
                    </p>
                  </div>
                </div>
              )}

              {!mintMode && selectedGotchi && currentNetwork && globalProvider && (
                <div
                  className={`selected-gotchi-container ${gameConfig.isLive ? 'clickable' : ''} ${enterPortal ? 'enter-anim' : ''} ${
                    selectedGotchi.isSpectator ? 'spectator' : ''
                  }`}
                  onClick={async () => await handleGameStart()}
                >
                  <div className="gotchi">
                    {selectedIsCartridgeHero ? (
                      <div
                        className="collateral-preview-svg"
                        style={{
                          width: `${selectedGotchiHeight}rem`,
                          height: `${selectedGotchiHeight}rem`,
                          position: 'relative',
                        }}
                      >
                        <Image
                          key={enterPortal ? 'back' : 'front'}
                          alt=""
                          src={
                            (enterPortal
                              ? cartridgeSideUrls?.[3] || collateralPreviewUrl
                              : cartridgeSideUrls?.[0] || collateralPreviewUrl) || GotchiLoading
                          }
                          layout="fill"
                          objectFit="contain"
                          unoptimized={
                            !!(enterPortal
                              ? cartridgeSideUrls?.[3] || collateralPreviewUrl
                              : cartridgeSideUrls?.[0] || collateralPreviewUrl)
                          }
                        />
                      </div>
                    ) : (
                      <GotchiSVG
                        tokenId={selectedGotchi.id}
                        side={enterPortal ? 3 : 0}
                        options={{ removeBg: true, animate: !enterPortal }}
                        height={selectedGotchiHeight}
                        isSpectator={selectedGotchi.isSpectator}
                      />
                    )}
                  </div>
                  <div className="glow"></div>
                  <div className="gotchi-name-container">
                    <div className="gotchi-name">
                      {selectedGotchi.isSpectator || selectedIsCartridgeHero || !selectedGotchi.readyToChannel ? null : (
                        <ChannelReadyToggle
                          size="4rem"
                          active={selectedGotchi.readyToChannel}
                          backgroundColor={`var(--col-${selectedGotchiRarity}-card-label-bg)`}
                        />
                      )}
                      <h4>
                        {selectedGotchi.isSpectator
                          ? 'Freebie'
                          : selectedGotchi.name}
                      </h4>
                    </div>
                    <p className="gotchi-caption">
                      {selectedGotchi.isSpectator
                        ? "Hi Fren! I'm always here for you!"
                        : selectedIsCartridgeHero
                        ? 'Cartridge cAavegotchi · Base traits 50'
                        : null}
                    </p>
                  </div>
                </div>
              )}

              <div className={`gotchi-details${mintMode ? ' mint-mode' : ''}`}>
                {mintStep === 'cartridge' && currentNetwork && globalProvider ? (
                  <CartridgeMintPanel
                    network={currentNetwork}
                    onMint={handleEnsureCartridge}
                    minting={minting}
                    mintError={mintError}
                  />
                ) : mintStep === 'caavegotchi' && currentNetwork && globalProvider ? (
                  <CollateralGotchiGallery
                    selectedCollateral={selectedCollateral}
                    onSelect={(c) => {
                      setMintError(null);
                      setSelectedWalletGotchi(null);
                      setSelectedCollateral(c);
                    }}
                    onMint={handleBindStarter}
                    minting={minting}
                    mintError={mintError}
                    selectedWalletGotchiId={selectedWalletGotchi?.id || null}
                    onSelectWalletGotchi={(gotchi) => {
                      setMintError(null);
                      setSelectedCollateral(null);
                      setSelectedWalletGotchi(gotchi);
                    }}
                    onMintWalletGotchi={handleMintWalletGotchi}
                  />
                ) : (
                  selectedGotchi &&
                  currentNetwork &&
                  globalProvider && (
                    <>
                      <GotchiDetailsPanel gotchi={selectedGotchi} />

                      {(isEvent && event) || (!isEvent && parcel) ? (
                        <div className="spawn-location-container">
                          <SpawnLocation
                            gotchi={selectedGotchi}
                            type={isEvent ? 'event' : 'parcel'}
                            parcel={parcel}
                            event={event}
                            onClickChange={() => setSpawnSelectorOpen(true)}
                            onClickEnter={async () => await handleGameStart()}
                          />
                          <button type="button" className="cta-last-position" onClick={async () => await handleGameStart(true)}>
                            <div className="location-icon">
                              <Image alt="" src={LastPositionNoBgIcon} width={20} height={20} />
                            </div>
                            <span>Use Last position</span>
                          </button>

                          {spawnSelectorOpen && (
                            <SpawnSelector
                              onClose={() => setSpawnSelectorOpen(false)}
                              handleSelect={(id) => {
                                handleSpawnSelect(id);
                                setSpawnSelectorOpen(false);
                              }}
                              type={isEvent ? 'EVENTS' : 'PARCELS'}
                              selectedSpawn={selectedSpawn}
                              selectedGotchi={selectedGotchi}
                            />
                          )}
                        </div>
                      ) : (
                        <EnterButton label="Enter Aarena >" onClick={async () => await handleGameStart()} />
                      )}
                    </>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </ModalWrapper>

      {manageHero && (
        <div
          className="manage-hero-overlay"
          onClick={() => setManageHero(null)}
          role="presentation"
        >
          <div
            className="manage-hero-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Manage cAavegotchi"
          >
            <button type="button" className="manage-hero-close" onClick={() => setManageHero(null)}>
              ×
            </button>
            <h3 className="manage-hero-title">Manage cAavegotchi</h3>
            <p className="manage-hero-name">{manageHero.name || `cAavegotchi #${manageHero.id}`}</p>
            <p className="manage-hero-body">
              Manage tools for this cartridge spirit are coming soon. You can still select it from the
              list (outside Manage) to enter the Gotchiverse.
            </p>
            <button
              type="button"
              className="manage-hero-cta"
              onClick={() => {
                const hero = manageHero;
                setManageHero(null);
                resetMintFlow();
                handleGotchiSelect(hero);
              }}
            >
              Select &amp; Play
            </button>
          </div>
        </div>
      )}

      <style jsx>{styles}</style>
    </>
  );
};
