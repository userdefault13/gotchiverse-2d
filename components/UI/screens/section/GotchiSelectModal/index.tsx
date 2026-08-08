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
  WearableImportPanel,
  WearableMintGallery,
  WearableCart,
  PaarcelMintGallery,
  PaarcelDetailPanel,
  PaarcelCart,
  InstallationInventoryGallery,
} from 'components/UI/screens/section';
import {
  ContractParcel,
  GotchiverseAavegotchi,
  GotchiverseParcel,
  JsonParcel,
  OwnedStatus,
  Parcel,
  RealmEvent,
} from 'types';
import { fetchAavegotchiURL, setAavegtochiToLocalStorage, getGotchiData, isTrueSpectator, brsToRarity } from 'helpers/gotchi.helper';
import { useRealm } from 'contexts/RealmContext';
import useResizeObserver from 'hooks/useResizeObserver';
import router from 'next/router';
import { toast } from 'react-toastify';
import {
  collateralByAddress,
  getMintableCollateralsForNetwork,
  type CollateralObject,
} from 'helpers/ethers.helper';
import { fetchCartridgeHeroSideSVGs, fetchCollateralGotchiBlobUrl } from 'helpers/collateralPreview';
import { traitNumber } from 'helpers/composeGotchi';
import { convertInlineSVGToBlobURL } from 'helpers/aavegotchi';
import { useUser } from 'contexts/UserContext';
import {
  bindAarcadeOwnedGotchi,
  bindAarcadeRentalGotchi,
  bindAarcadeStarter,
  ensureAarcadeCartridge,
  getAarcadeCartridgeStatus,
  getCartridgeWearables,
  getCartridgePaarcels,
  importCartridgeWearables,
  importCartridgePaarcels,
  importCartridgeInstallations,
} from 'helpers/auth.helper';
import {
  collateralFromSimId,
  collateralNameForWalletGotchi,
  heroesFromCartridgeSnapshot,
  mapCartridgeHeroToGotchi,
  mintedSourceTokenIds,
  type CartridgeHero,
} from 'helpers/cartridgeHero.helper';
import {
  listEquippedWearableSlots,
  listMintableWearablesFromBoundGotchis,
  normalizeCWearables,
  wearablesFromCartridgeSnapshot,
  type MintableWearableRow,
} from 'helpers/cartridgeWearable.helper';
import type { MintableInstallationRow, MintablePaarcelRow } from 'helpers/cartridgePaarcel.helper';
import {
  cPaarcelsToGotchiverseParcels,
  enrichMintablePaarcelWithOnChainEquips,
  enrichMintablePaarcelsWithOnChainEquips,
  filterMintablePaarcelsOwnedByWallet,
} from 'helpers/cartridgePaarcel.helper';

import { GotchiverseBaseCartridge, GotchiverseBtcCartridge, GotchiverseRhCartridge } from 'assets';
import {
  fetchAndSetGlobalParcels,
  fetchContractOwnedParcels,
  fetchSubgraphOwnedParcel,
  getParcelAccessRights,
  getParcelsAccessRightsWhitelistIds,
  mapInGotchiverseParcelData,
  transformParcelFormat,
} from 'helpers/parcels.helper';
import { updateInventory } from 'contexts/UserContext/actions';
import Image from 'next/image';
import GameController from 'components/controllers/GameController';
import _ from 'lodash';
import { GotchiSVG, MaticNeeded, MintGhostOverlay, SoftCText } from 'components/UI/widgets';
import { PARCELS_BY_TOKEN_ID } from 'shared_code/models/model.realm';
import { ClosedPortal, GotchiLoading, GotchiverseLogo, LastPositionNoBgIcon, PortalLightningBg } from 'assets';
import { useGame } from 'contexts/GameContext';
import { useNotification } from 'contexts/NotificationContext';
import {
  showTransactionNotification,
  updateTransactionNotificationStatus,
} from 'contexts/NotificationContext/actions';
import { NotificationStack } from 'components/UI/hud/components';
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
  /** Eager parent update so center art switches before router.query settles. */
  onSelectedGotchiChange?: (gotchi: GotchiverseAavegotchi) => void;
}

export const GotchiSelectModal = ({
  selectedSpawn,
  selectedGotchi,
  onSelectedGotchiChange,
  handleSpawnSelect,
  onBack,
}: Props): JSX.Element => {
  const [{ currentAccount, currentNetwork, globalProvider, ethersSigner }] = useWeb3();
  const [{ eventsList }, realmDispatch] = useRealm();
  const [{ gameConfig }] = useGame();
  const [{ hasCartridge, cartridgeId, cartridgeHeroes, userAavegotchis, wearableInventory, ownedParcels, parcelInventory }, userDispatch] =
    useUser();
  const [, notificationDispatch] = useNotification();

  const { portalOpen, sending } = useAavegotchiSound();

  // TODO: GAME_CONFIG.demoGotchiMode should be pulled from the API before page load and not start with the the default constant version here
  const [storedId, setStoredId] = useState<string>();
  const [enterPortal, setEnterPortal] = useState(false);
  const [parcel, setParcel] = useState<JsonParcel>(null);
  const [event, setEvent] = useState<RealmEvent>();
  const [entering, setEntering] = useState(false);
  const [spawnSelectorOpen, setSpawnSelectorOpen] = useState(false);
  const [isEvent, setIsEvent] = useState(false);
  /** Right-rail modes for soft-launch mint / wearables / paarcels. */
  const [mintStep, setMintStep] = useState<
    'cartridge' | 'caavegotchi' | 'wearables-import' | 'wearables' | 'paarcels' | 'installations' | null
  >(null);
  const [selectedCollateral, setSelectedCollateral] = useState<CollateralObject | null>(null);
  const [selectedWalletGotchi, setSelectedWalletGotchi] = useState<GotchiverseAavegotchi | null>(null);
  const [importSourceGotchi, setImportSourceGotchi] = useState<GotchiverseAavegotchi | null>(null);
  const [importBindKind, setImportBindKind] = useState<'owned' | 'rental'>('owned');
  const [pendingHeroAfterImport, setPendingHeroAfterImport] = useState<CartridgeHero | null>(null);
  const [manageHero, setManageHero] = useState<GotchiverseAavegotchi | null>(null);
  const [collateralPreviewUrl, setCollateralPreviewUrl] = useState<string | null>(null);
  /** 4-side blob URLs for cAavegotchi enter anim (index 3 = back). */
  const [cartridgeSideUrls, setCartridgeSideUrls] = useState<[string, string, string, string] | null>(null);
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  /** Full-screen loading ghost + progress while minting cAavegotchis. */
  const [mintGhost, setMintGhost] = useState<{ label: string; progress: number } | null>(null);
  /** cWearables manage cart — distinct source instances (by row.key). */
  const [wearableCartRows, setWearableCartRows] = useState<MintableWearableRow[]>([]);
  /** cPaarcels manage cart. */
  const [paarcelCartRows, setPaarcelCartRows] = useState<MintablePaarcelRow[]>([]);
  const [paarcelInstallCartRows, setPaarcelInstallCartRows] = useState<MintableInstallationRow[]>([]);
  /** When set, center rail shows PaarcelDetailPanel instead of mint gallery. */
  const [selectedPaarcelId, setSelectedPaarcelId] = useState<string | null>(null);
  const mintMode = mintStep !== null;

  const selectedPaarcel = useMemo(() => {
    if (!selectedPaarcelId) return null;
    return (
      (parcelInventory || []).find((p) => String(p.realmTokenId) === String(selectedPaarcelId)) || null
    );
  }, [selectedPaarcelId, parcelInventory]);

  useEffect(() => {
    if (mintStep !== 'paarcels') setSelectedPaarcelId(null);
  }, [mintStep]);
  const cartridgeArt =
    currentNetwork === 'robinhood'
      ? GotchiverseRhCartridge
      : currentNetwork === 'bitcoin'
        ? GotchiverseBtcCartridge
        : GotchiverseBaseCartridge;
  const selectedIsCartridgeHero = Boolean(selectedGotchi?.isCartridgeHero);

  const previewCollateral = useMemo(() => {
    if (mintStep === 'caavegotchi' && selectedCollateral) return selectedCollateral;
    if (selectedIsCartridgeHero) return collateralFromSimId(selectedGotchi?.cartridgeCollateral);
    return null;
  }, [mintStep, selectedCollateral, selectedIsCartridgeHero, selectedGotchi?.cartridgeCollateral]);

  /** Stable key so center Image remounts when the selected cAavegotchi / collateral / gear changes. */
  const previewArtKey = useMemo(() => {
    if (mintStep === 'caavegotchi' && selectedWalletGotchi) return `wallet-${selectedWalletGotchi.id}`;
    if (mintStep === 'caavegotchi' && selectedCollateral) {
      return `coll-${selectedCollateral.name || selectedCollateral.svgId}`;
    }
    if (selectedIsCartridgeHero) {
      const equip = (selectedGotchi?.equippedWearables || []).join(',');
      return `hero-${selectedGotchi?.id}-${selectedGotchi?.cartridgeCollateral || ''}-${equip}`;
    }
    return selectedGotchi?.id || 'none';
  }, [
    mintStep,
    selectedWalletGotchi,
    selectedCollateral,
    selectedIsCartridgeHero,
    selectedGotchi?.id,
    selectedGotchi?.cartridgeCollateral,
    selectedGotchi?.equippedWearables,
  ]);

  const selectedEquipPreview = useMemo(() => {
    if (!selectedIsCartridgeHero || !selectedGotchi) return null;
    const equipped = (selectedGotchi.equippedWearables || []).map((n) => Number(n) || 0);
    const traits = (selectedGotchi.withSetsNumericTraits || selectedGotchi.numericTraits || []).map(
      (n) => traitNumber(n, 50),
    );
    const sourceTokenId = selectedGotchi.cartridgeSourceTokenId || '';
    const hauntId =
      selectedGotchi.hauntId === 1 || selectedGotchi.hauntId === 2
        ? selectedGotchi.hauntId
        : undefined;
    const collateralKey = selectedGotchi.cartridgeCollateral || '';
    return {
      equipped,
      traits,
      sourceTokenId,
      hauntId,
      // Include hero id + collateral so switching cAavegotchis always invalidates the fetch.
      key: `${selectedGotchi.id}|${collateralKey}|src${sourceTokenId}|h${hauntId ?? '?'}|${equipped.join(',')}|${traits.join(',')}`,
    };
  }, [selectedIsCartridgeHero, selectedGotchi]);

  const boundWalletIds = useMemo(() => mintedSourceTokenIds(cartridgeHeroes), [cartridgeHeroes]);
  const mintableWearableRows = useMemo(
    () => listMintableWearablesFromBoundGotchis(userAavegotchis, boundWalletIds, wearableInventory),
    [userAavegotchis, boundWalletIds, wearableInventory],
  );
  const availableWearableRows = useMemo(
    () => mintableWearableRows.filter((r) => !r.alreadyMinted),
    [mintableWearableRows],
  );
  const wearableCartKeys = useMemo(() => new Set(wearableCartRows.map((r) => r.key)), [wearableCartRows]);
  const paarcelCartKeys = useMemo(() => new Set(paarcelCartRows.map((r) => r.key)), [paarcelCartRows]);
  const paarcelInstallCartKeys = useMemo(
    () => new Set(paarcelInstallCartRows.map((r) => r.key)),
    [paarcelInstallCartRows],
  );

  // Drop cart lines that are no longer mintable (already minted / unbound).
  useEffect(() => {
    if (mintStep !== 'wearables') return;
    const availableKeys = new Set(availableWearableRows.map((r) => r.key));
    setWearableCartRows((prev) => {
      const next = prev.filter((r) => availableKeys.has(r.key));
      return next.length === prev.length ? prev : next;
    });
  }, [mintStep, availableWearableRows]);

  useEffect(() => {
    let cancelled = false;
    // Drop prior art immediately so switching cAavegotchis never keeps the old collateral on screen.
    setCollateralPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCartridgeSideUrls((prev) => {
      if (prev) prev.forEach((u) => URL.revokeObjectURL(u));
      return null;
    });
    if (!previewCollateral) return;

    // Mint gallery (different collateral than the selected hero): bare body.
    // Play select + manage-click on an owned hero: full equipped art for all 4 sides.
    const heroCollMatchesPreview =
      selectedIsCartridgeHero &&
      collateralFromSimId(selectedGotchi?.cartridgeCollateral)?.name === previewCollateral.name;
    const useHeroEquip =
      Boolean(selectedEquipPreview) && (mintStep !== 'caavegotchi' || heroCollMatchesPreview);
    const equipped = useHeroEquip ? selectedEquipPreview?.equipped || null : null;
    const traits = useHeroEquip ? selectedEquipPreview?.traits || null : null;
    const sourceTokenId = useHeroEquip ? selectedEquipPreview?.sourceTokenId || null : null;
    const hauntId = useHeroEquip ? selectedEquipPreview?.hauntId ?? null : null;

    void fetchCollateralGotchiBlobUrl(
      previewCollateral,
      currentNetwork,
      equipped,
      traits,
      sourceTokenId,
      hauntId,
    ).then((url) => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      setCollateralPreviewUrl(url);
    });
    // Prefetch all 4 sides (front/left/right/back) for enter-portal + in-game spritesheet.
    void fetchCartridgeHeroSideSVGs(
      previewCollateral,
      currentNetwork,
      equipped,
      traits,
      sourceTokenId,
      hauntId,
    ).then((sides) => {
      if (cancelled) return;
      const urls = sides.map((svg) => convertInlineSVGToBlobURL(svg)) as [string, string, string, string];
      if (cancelled) {
        urls.forEach((u) => URL.revokeObjectURL(u));
        return;
      }
      setCartridgeSideUrls(urls);
    });
    return () => {
      cancelled = true;
    };
  }, [
    previewCollateral,
    currentNetwork,
    mintStep,
    selectedIsCartridgeHero,
    selectedEquipPreview?.key,
    previewArtKey,
    selectedGotchi?.cartridgeCollateral,
  ]);

  const syncCartridgeFromResult = async (result: {
    cartridgeId?: string;
    gameId?: string;
    heroes?: CartridgeHero[];
    cartridge?: unknown;
    wearableInventory?: unknown;
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
    const wearables = Array.isArray(result.wearableInventory)
      ? normalizeCWearables(result.wearableInventory)
      : wearablesFromCartridgeSnapshot(result.cartridge);
    userDispatch({
      type: 'UPDATE_USER_CARTRIDGE',
      cartridgeId: result.cartridgeId,
      hasCartridge: true,
      cartridgeHeroes: heroes || [],
      ...(result.wearableInventory !== undefined || wearables.length > 0
        ? { wearableInventory: wearables }
        : {}),
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
  const selectedGotchiHeight = useMemo(() => {
    // Mint preview uses the same scale as the normal select hero.
    if (mintMode) return isDesktop ? 42 : 36;
    if (!selectedGotchi) return 0;
    if (isTrueSpectator(selectedGotchi.isSpectator)) return 30;
    return isDesktop ? 42 : 36;
  }, [isDesktop, selectedGotchi, mintMode]);

  const mintPreviewTip = useMemo(() => {
    if (mintStep === 'cartridge') {
      return { title: 'Gotchiverse Cartridge', caption: 'Soft launch · Free mint' };
    }
    if (mintStep === 'wearables-import') {
      return {
        title: importSourceGotchi?.name || `#${importSourceGotchi?.id || ''}`,
        caption: 'Choose equipped wearables to mint as cWearables',
      };
    }
    if (mintStep === 'caavegotchi') {
      if (selectedWalletGotchi) {
        return {
          title: selectedWalletGotchi.name || `#${selectedWalletGotchi.id}`,
          caption: selectedWalletGotchi.isLent
            ? 'Wallet gotchi · Free mint (borrower)'
            : 'Wallet gotchi · Free mint (owner)',
        };
      }
      if (selectedCollateral) {
        return {
          title: selectedCollateral.maticDisplay || selectedCollateral.name,
          caption: 'Base traits 50 · ES 50 · EC 50 · $5 USDC (sim)',
        };
      }
      return { title: 'cAavegotchi', caption: 'Choose collateral or a wallet gotchi →' };
    }
    return null;
  }, [mintStep, importSourceGotchi, selectedWalletGotchi, selectedCollateral]);

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
    setImportSourceGotchi(null);
    setPendingHeroAfterImport(null);
    setMintError(null);
    setWearableCartRows([]);
  };

  const addWearableToCart = useCallback((row: MintableWearableRow) => {
    if (row.alreadyMinted) return;
    setWearableCartRows((prev) => (prev.some((r) => r.key === row.key) ? prev : [...prev, row]));
  }, []);

  const addAllWearablesToCart = useCallback((rows: MintableWearableRow[]) => {
    setWearableCartRows((prev) => {
      const keys = new Set(prev.map((r) => r.key));
      const next = [...prev];
      for (const row of rows) {
        if (row.alreadyMinted || keys.has(row.key)) continue;
        keys.add(row.key);
        next.push(row);
      }
      return next;
    });
  }, []);

  const setWearableCartQuantity = useCallback(
    (itemTypeId: number, qty: number) => {
      const pool = availableWearableRows
        .filter((r) => r.itemTypeId === itemTypeId)
        .sort((a, b) => a.key.localeCompare(b.key));
      const target = Math.max(0, Math.min(qty, pool.length));
      setWearableCartRows((prev) => {
        const others = prev.filter((r) => r.itemTypeId !== itemTypeId);
        if (target === 0) return others;
        return [...others, ...pool.slice(0, target)];
      });
    },
    [availableWearableRows],
  );

  const removeWearableCartLine = useCallback((itemTypeId: number) => {
    setWearableCartRows((prev) => prev.filter((r) => r.itemTypeId !== itemTypeId));
  }, []);

  const finishWithHero = (hero: CartridgeHero | null, inventory?: typeof wearableInventory) => {
    resetMintFlow();
    if (hero && currentAccount) {
      handleGotchiSelect(
        mapCartridgeHeroToGotchi(hero, currentAccount, inventory ?? wearableInventory),
      );
    }
  };

  const enterCaavegotchiStep = () => {
    setMintError(null);
    setSelectedWalletGotchi(null);
    setMintStep('caavegotchi');
    // Default collateral so center + tip match immediately in manage mint rail.
    // Bitcoin soft-launch: BTC cAavegotchi only (amWBTC).
    const mintables = getMintableCollateralsForNetwork(currentNetwork);
    setSelectedCollateral((prev) => {
      if (prev && mintables.some((c) => c.name === prev.name)) return prev;
      return mintables[0] || null;
    });
  };

  const handleGotchiSelect = (gotchi: GotchiverseAavegotchi) => {
    if (gotchi) {
      resetMintFlow();
      // Apply immediately — don't wait on router.query so center preview / sides refresh now.
      onSelectedGotchiChange?.(gotchi);
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
    // Already minted → Manage enters rail; Exit (mintMode active) leaves manage entirely.
    if (hasCartridge) {
      if (mintMode) {
        resetMintFlow();
        return;
      }
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
    const label = selectedCollateral.maticDisplay || selectedCollateral.name;
    setMinting(true);
    setMintError(null);
    setMintGhost({ label: `Binding ${label}…`, progress: 18 });
    const notifId = showTransactionNotification(notificationDispatch, {
      message: 'cAavegotchi',
      title: `Binding ${label}`,
      options: { sound: true },
    });
    try {
      // $5 USDC sim not live — bind still runs without charge.
      setMintGhost({ label: `Binding ${label}…`, progress: 55 });
      const result = await bindAarcadeStarter(currentAccount, selectedCollateral.name, {
        network: currentNetwork,
      });
      if (!result.ok || !result.cartridgeId) {
        const msg = result.error || 'Bind failed';
        setMintError(msg);
        toast.error(msg, { theme: 'dark' });
        updateTransactionNotificationStatus(notificationDispatch, notifId, 'error', msg);
        return;
      }
      setMintGhost({ label: 'Syncing cartridge…', progress: 88 });
      const heroes = await syncCartridgeFromResult(result);
      setMintGhost({ label: 'Bound!', progress: 100 });
      updateTransactionNotificationStatus(
        notificationDispatch,
        notifId,
        'success',
        result.alreadyBound
          ? 'Already bound'
          : `Bound ${label} ($5 USDC sim — not charged)`,
      );
      resetMintFlow();
      const bound =
        heroes.find((h) => h.collateral === result.collateral) ||
        heroes[heroes.length - 1] ||
        null;
      if (bound) {
        handleGotchiSelect(mapCartridgeHeroToGotchi(bound, currentAccount, wearableInventory));
      }
    } catch (e) {
      const msg = (e as Error)?.message || 'Bind failed';
      setMintError(msg);
      updateTransactionNotificationStatus(notificationDispatch, notifId, 'error', msg);
    } finally {
      setMintGhost(null);
      setMinting(false);
    }
  };

  const bindWalletGotchi = async (gotchi: GotchiverseAavegotchi) => {
    const wallet = String(currentAccount || '');
    const collateral = collateralNameForWalletGotchi(currentNetwork, gotchi.collateral);
    if (gotchi.isLent) {
      return bindAarcadeRentalGotchi(wallet, gotchi.id, collateral, {
        network: currentNetwork,
      });
    }
    return bindAarcadeOwnedGotchi(wallet, gotchi.id, collateral, {
      network: currentNetwork,
    });
  };

  /** Import each wearable as its own cWearable, then equip onto the bound hero. */
  const importAndEquipForGotchi = async (
    gotchi: GotchiverseAavegotchi,
    hero: CartridgeHero | null,
    cid: string | null | undefined,
  ) => {
    const bindKind = gotchi.isLent ? 'rental' : 'owned';
    const gear = listEquippedWearableSlots(gotchi, bindKind);
    if (gear.length === 0) {
      return {
        ok: true as const,
        imported: 0,
        equipped: 0,
        alreadyMinted: 0,
        wearableInventory: wearableInventory || [],
      };
    }
    if (!currentAccount || !hero) {
      return {
        ok: false as const,
        error: !hero
          ? 'Bound hero missing after mint — cannot equip wearables'
          : 'Connect a wallet to mint wearables',
        imported: 0,
        equipped: 0,
        alreadyMinted: 0,
        wearableInventory: wearableInventory || [],
      };
    }
    const result = await importCartridgeWearables(currentAccount, {
      sourceTokenId: gotchi.id,
      items: gear.map((s) => ({ itemTypeId: s.itemTypeId, slotIndex: s.slotIndex })),
      bindKind,
      cartridgeId: cid,
      network: currentNetwork,
      equipAfterImport: true,
      heroId: hero.id,
    });
    if (!result.ok) {
      return {
        ok: false as const,
        error: result.error || 'Wearable mint/equip failed',
        imported: result.imported || 0,
        equipped: result.equipped || 0,
        alreadyMinted: result.alreadyMinted || 0,
        wearableInventory: result.wearableInventory || [],
      };
    }
    userDispatch({
      type: 'UPDATE_USER_CARTRIDGE',
      cartridgeId: result.cartridgeId || cid,
      hasCartridge: true,
      wearableInventory: result.wearableInventory,
    });
    return {
      ok: true as const,
      imported: result.imported || 0,
      equipped: result.equipped || 0,
      alreadyMinted: result.alreadyMinted || 0,
      wearableInventory: result.wearableInventory || [],
    };
  };

  /** Owners & borrowers: bind L1 gotchi onto cartridge as cAavegotchi (free / simPay). */
  const handleMintWalletGotchi = async (opts?: { withWearables?: boolean }) => {
    if (minting || !selectedWalletGotchi || !currentAccount) {
      if (!currentAccount) {
        setMintError('Connect a wallet to mint');
        toast.error('Connect a wallet to mint', { theme: 'dark' });
      }
      return;
    }
    const withWearables = opts?.withWearables !== false;
    const tokenLabel = `#${selectedWalletGotchi.id}`;
    setMinting(true);
    setMintError(null);
    setMintGhost({ label: `Minting ${tokenLabel}…`, progress: 12 });
    const notifId = showTransactionNotification(notificationDispatch, {
      message: 'cAavegotchi',
      title: `Minting ${tokenLabel}`,
      options: { sound: true },
    });
    try {
      const result = await bindWalletGotchi(selectedWalletGotchi);
      if (!result.ok || !result.cartridgeId) {
        const msg = result.error || 'Mint failed';
        setMintError(msg);
        toast.error(msg, { theme: 'dark' });
        updateTransactionNotificationStatus(notificationDispatch, notifId, 'error', msg);
        return;
      }
      setMintGhost({ label: `Syncing ${tokenLabel}…`, progress: 45 });
      const heroes = await syncCartridgeFromResult(result);
      const role = selectedWalletGotchi.isLent ? 'borrower' : 'owner';
      const bound =
        heroes.find((h) => String(h.sourceTokenId) === String(selectedWalletGotchi.id)) ||
        heroes[heroes.length - 1] ||
        null;
      const bindKind = selectedWalletGotchi.isLent ? 'rental' : 'owned';
      const gear = listEquippedWearableSlots(selectedWalletGotchi, bindKind);
      if (withWearables && gear.length > 0) {
        setMintGhost({
          label: `Minting wearables for ${tokenLabel}…`,
          progress: 68,
        });
        const wear = await importAndEquipForGotchi(selectedWalletGotchi, bound, result.cartridgeId);
        if (!wear.ok) {
          setMintError(wear.error || 'Wearable mint/equip failed');
          toast.error(wear.error || 'Wearable mint/equip failed', { theme: 'dark' });
          updateTransactionNotificationStatus(
            notificationDispatch,
            notifId,
            'error',
            wear.error || 'Wearable mint/equip failed',
          );
          // Gotchi minted; leave player on the hero even if gear failed.
          finishWithHero(bound, wear.wearableInventory);
          return;
        }
        setMintGhost({ label: 'Equipping wearables…', progress: 92 });
        updateTransactionNotificationStatus(
          notificationDispatch,
          notifId,
          'success',
          result.alreadyBound
            ? `Already minted ${tokenLabel}`
            : `Minted ${tokenLabel} free (${role}) · ${wear.equipped} wearable${
                wear.equipped === 1 ? '' : 's'
              }`,
        );
        finishWithHero(bound, wear.wearableInventory);
        return;
      } else {
        setMintGhost({ label: 'Minted!', progress: 100 });
        updateTransactionNotificationStatus(
          notificationDispatch,
          notifId,
          'success',
          result.alreadyBound
            ? `Already minted ${tokenLabel}`
            : `Minted ${tokenLabel} free (${role})`,
        );
      }
      finishWithHero(bound);
    } catch (e) {
      const msg = (e as Error)?.message || 'Mint failed';
      setMintError(msg);
      updateTransactionNotificationStatus(notificationDispatch, notifId, 'error', msg);
    } finally {
      setMintGhost(null);
      setMinting(false);
    }
  };

  /** Batch-bind every owned wallet gotchi not already on the cartridge. */
  const handleMintAllOwnedWalletGotchis = async (opts?: { withWearables?: boolean }) => {
    if (minting || !currentAccount) {
      if (!currentAccount) {
        setMintError('Connect a wallet to mint');
        toast.error('Connect a wallet to mint', { theme: 'dark' });
      }
      return;
    }
    const withWearables = opts?.withWearables !== false;
    const minted = mintedSourceTokenIds(cartridgeHeroes);
    const queue = (userAavegotchis || []).filter((g) => !g.isLent && !minted.has(String(g.id)));
    if (queue.length === 0) {
      toast.info('All owned gotchis are already minted', { theme: 'dark' });
      return;
    }

    setMinting(true);
    setMintError(null);
    setMintGhost({ label: `Minting owned 1/${queue.length}…`, progress: 4 });
    const notifId = showTransactionNotification(notificationDispatch, {
      message: 'cAavegotchi',
      title: `Minting ${queue.length} owned`,
      options: { sound: true },
    });
    let okCount = 0;
    let skipCount = 0;
    let gearMinted = 0;
    let gearEquipped = 0;
    let lastHeroes: CartridgeHero[] = cartridgeHeroes || [];
    let lastInventory = wearableInventory || [];
    let failed = false;
    try {
      for (let i = 0; i < queue.length; i++) {
        const gotchi = queue[i];
        const stepPct = Math.round(((i + 0.35) / queue.length) * 100);
        setMintGhost({
          label: `Minting owned ${i + 1}/${queue.length} · #${gotchi.id}`,
          progress: Math.min(96, Math.max(6, stepPct)),
        });
        const result = await bindWalletGotchi(gotchi);
        if (!result.ok || !result.cartridgeId) {
          const msg = result.error || `Failed on #${gotchi.id}`;
          setMintError(msg);
          toast.error(msg, { theme: 'dark' });
          updateTransactionNotificationStatus(notificationDispatch, notifId, 'error', msg);
          failed = true;
          break;
        }
        lastHeroes = await syncCartridgeFromResult(result);
        if (result.alreadyBound) skipCount += 1;
        else okCount += 1;

        if (withWearables) {
          setMintGhost({
            label: `Wearables ${i + 1}/${queue.length} · #${gotchi.id}`,
            progress: Math.min(98, Math.round(((i + 0.75) / queue.length) * 100)),
          });
          const bound =
            lastHeroes.find((h) => String(h.sourceTokenId) === String(gotchi.id)) ||
            lastHeroes[lastHeroes.length - 1] ||
            null;
          const wear = await importAndEquipForGotchi(gotchi, bound, result.cartridgeId);
          if (!wear.ok) {
            const msg = wear.error || `Wearables failed on #${gotchi.id}`;
            setMintError(msg);
            toast.error(msg, { theme: 'dark' });
            updateTransactionNotificationStatus(notificationDispatch, notifId, 'error', msg);
            failed = true;
            break;
          }
          gearMinted += wear.imported;
          gearEquipped += wear.equipped;
          lastInventory = wear.wearableInventory || lastInventory;
        }
      }
      if (!failed && okCount + skipCount > 0) {
        setMintGhost({ label: 'Mint complete!', progress: 100 });
        updateTransactionNotificationStatus(
          notificationDispatch,
          notifId,
          'success',
          `Minted ${okCount} owned${
            skipCount ? ` · ${skipCount} already on cartridge` : ''
          }${
            withWearables && gearEquipped
              ? ` · ${gearEquipped} wearables (${gearMinted} new)`
              : ''
          }`,
        );
      } else if (!failed) {
        updateTransactionNotificationStatus(notificationDispatch, notifId, 'error', 'Nothing minted');
      }
      if (lastHeroes.length > 0 && okCount > 0) {
        resetMintFlow();
        const last = lastHeroes[lastHeroes.length - 1];
        handleGotchiSelect(mapCartridgeHeroToGotchi(last, currentAccount, lastInventory));
      }
    } catch (e) {
      const msg = (e as Error)?.message || 'Mint failed';
      setMintError(msg);
      updateTransactionNotificationStatus(notificationDispatch, notifId, 'error', msg);
    } finally {
      setMintGhost(null);
      setMinting(false);
    }
  };

  const handleImportWearables = async (items: { itemTypeId: number; slotIndex: number }[]) => {
    if (minting || !currentAccount || !importSourceGotchi || items.length === 0) return;
    setMinting(true);
    setMintError(null);
    try {
      const result = await importCartridgeWearables(currentAccount, {
        sourceTokenId: importSourceGotchi.id,
        items,
        bindKind: importBindKind,
        cartridgeId,
        network: currentNetwork,
        equipAfterImport: Boolean(pendingHeroAfterImport?.id),
        heroId: pendingHeroAfterImport?.id,
      });
      if (!result.ok) {
        const msg = result.error || 'Wearable import failed';
        setMintError(msg);
        toast.error(msg, { theme: 'dark' });
        return;
      }
      userDispatch({
        type: 'UPDATE_USER_CARTRIDGE',
        cartridgeId: result.cartridgeId || cartridgeId,
        hasCartridge: true,
        wearableInventory: result.wearableInventory,
      });
      toast.success(
        `Minted ${result.imported || 0} cWearable${(result.imported || 0) === 1 ? '' : 's'}${
          result.equipped ? ` · equipped ${result.equipped}` : ''
        }${result.alreadyMinted ? ` · ${result.alreadyMinted} already owned` : ''}`,
        { theme: 'dark' },
      );
      finishWithHero(pendingHeroAfterImport, result.wearableInventory);
    } finally {
      setMinting(false);
    }
  };

  const handleManageWearablesClick = async () => {
    if (entering || minting) return;
    setMintError(null);
    setMintStep('wearables');
    if (!currentAccount || !cartridgeId) return;
    const result = await getCartridgeWearables(currentAccount, cartridgeId);
    if (result.ok) {
      userDispatch({
        type: 'UPDATE_USER_CARTRIDGE',
        wearableInventory: result.wearableInventory,
      });
    }
  };

  const handleManagePaarcelsClick = async () => {
    if (entering || minting) return;
    setMintError(null);
    setSelectedPaarcelId(null);
    setMintStep('paarcels');
    if (
      currentAccount &&
      globalProvider &&
      currentNetwork &&
      currentNetwork !== 'robinhood' &&
      currentNetwork !== 'bitcoin'
    ) {
      // Owned list: Base Realm tokenIdsOfOwner (Aarcade subgraph owner filters not healthy yet).
      // Subgraph URLs still point at Aarcade for other reads once compat proxy is fixed.
      try {
        const subgraphParcels = await fetchSubgraphOwnedParcel(
          currentAccount,
          globalProvider,
          currentNetwork,
        );
        userDispatch({
          type: 'UPDATE_OWNED_PARCELS',
          ownedParcels: (subgraphParcels || []).map((p) => ({
            ...p,
            owner: currentAccount,
            isLent: false,
          })),
        });
        setPaarcelCartRows([]);
        setMintError(null);
      } catch (e) {
        console.warn('@handleManagePaarcelsClick owned parcels', e);
        toast.error('Could not load owned parcels', { theme: 'dark' });
      }
      void updateInventory(
        { network: currentNetwork, provider: globalProvider, account: currentAccount },
        userDispatch,
      );
    }
    if (!currentAccount || !cartridgeId) return;
    const result = await getCartridgePaarcels(currentAccount, cartridgeId);
    if (result.ok) {
      userDispatch({
        type: 'UPDATE_USER_CARTRIDGE',
        parcelInventory: result.parcelInventory,
        installationInventory: result.installationInventory,
      });
    }
  };

  const handleManageInstallationsClick = async () => {
    if (entering || minting) return;
    setMintError(null);
    setMintStep('installations');
    if (!currentAccount || !cartridgeId) return;
    const result = await getCartridgePaarcels(currentAccount, cartridgeId);
    if (result.ok) {
      userDispatch({
        type: 'UPDATE_USER_CARTRIDGE',
        parcelInventory: result.parcelInventory,
        installationInventory: result.installationInventory,
      });
    }
  };

  const addPaarcelToCart = async (row: MintablePaarcelRow) => {
    if (!currentNetwork || !globalProvider || !currentAccount) return;
    const net = (currentNetwork === 'robinhood' || currentNetwork === 'bitcoin') ? 'base' : currentNetwork;
    const { owned, skipped } = await filterMintablePaarcelsOwnedByWallet([row], {
      wallet: currentAccount,
      network: net,
      provider: globalProvider,
    });
    if (skipped.length || !owned.length) {
      toast.info(`Parcel #${row.realmTokenId} is owned by another wallet (rentals cannot be minted)`, {
        theme: 'dark',
      });
      return;
    }
    const enriched = await enrichMintablePaarcelWithOnChainEquips(owned[0], {
      network: net,
      provider: globalProvider,
    });
    setPaarcelCartRows((prev) => (prev.some((r) => r.key === enriched.key) ? prev : [...prev, enriched]));
  };

  const addAllPaarcelsToCart = async (rows: MintablePaarcelRow[]) => {
    if (!currentNetwork || !globalProvider || !currentAccount || rows.length === 0) return;
    const net = (currentNetwork === 'robinhood' || currentNetwork === 'bitcoin') ? 'base' : currentNetwork;
    const { owned, skipped } = await filterMintablePaarcelsOwnedByWallet(rows, {
      wallet: currentAccount,
      network: net,
      provider: globalProvider,
    });
    if (skipped.length > 0) {
      toast.info(
        `Skipped ${skipped.length} parcel${skipped.length === 1 ? '' : 's'} owned by another wallet`,
        { theme: 'dark' },
      );
    }
    if (!owned.length) return;
    const enriched = await enrichMintablePaarcelsWithOnChainEquips(owned, {
      network: net,
      provider: globalProvider,
    });
    setPaarcelCartRows((prev) => {
      const keys = new Set(prev.map((r) => r.key));
      const next = [...prev];
      for (const row of enriched) {
        if (!keys.has(row.key)) {
          keys.add(row.key);
          next.push(row);
        }
      }
      return next;
    });
  };

  const addPaarcelInstallToCart = (row: MintableInstallationRow) => {
    setPaarcelInstallCartRows((prev) => (prev.some((r) => r.key === row.key) ? prev : [...prev, row]));
  };
  const addAllPaarcelInstallsToCart = (rows: MintableInstallationRow[]) => {
    setPaarcelInstallCartRows((prev) => {
      const keys = new Set(prev.map((r) => r.key));
      const next = [...prev];
      for (const row of rows) {
        if (!keys.has(row.key)) {
          keys.add(row.key);
          next.push(row);
        }
      }
      return next;
    });
  };

  // Keep cart aligned with on-chain ownership (drop rented / access-only if ownedParcels refreshes).
  useEffect(() => {
    if (!currentAccount) return;
    const ownedIds = new Set(
      (ownedParcels || [])
        .filter((p) => !p.isLent)
        .filter((p) => {
          const owner = String(p.owner || '').toLowerCase();
          return !owner || owner === currentAccount.toLowerCase();
        })
        .map((p) => String(p.tokenId || p.id || '')),
    );
    setPaarcelCartRows((prev) => {
      const next = prev.filter((r) => ownedIds.has(r.realmTokenId));
      return next.length === prev.length ? prev : next;
    });
  }, [ownedParcels, currentAccount]);

  const handleMintPaarcelCart = async () => {
    if (minting || !currentAccount) return;
    if (paarcelCartRows.length === 0 && paarcelInstallCartRows.length === 0) return;
    setMinting(true);
    setMintError(null);
    let imported = 0;
    let alreadyMinted = 0;
    let failedCount = 0;
    let nestedInstalls = 0;
    try {
      if (paarcelCartRows.length > 0) {
        const net = (currentNetwork === 'robinhood' || currentNetwork === 'bitcoin') ? 'base' : currentNetwork;
        // Only drop parcels whose Base ownerOf is a different address (true rentals).
        // RPC failures stay in cart and are verified by Aarcade.
        const { owned: ownedRows, skipped } = await filterMintablePaarcelsOwnedByWallet(paarcelCartRows, {
          wallet: currentAccount,
          network: 'base',
          provider: globalProvider,
        });
        if (skipped.length) {
          setPaarcelCartRows(ownedRows);
          failedCount += skipped.length;
        }
        if (!ownedRows.length) {
          const msg =
            'No cart parcels are owned by this wallet on Base (rentals / other owners cannot be minted)';
          setMintError(msg);
          toast.error(msg, { theme: 'dark' });
          return;
        }
        // Fresh on-chain equip snapshot right before mint (grid x/y like play mode).
        const toMint = globalProvider
          ? await enrichMintablePaarcelsWithOnChainEquips(ownedRows, {
              network: net || 'base',
              provider: globalProvider,
            })
          : ownedRows;
        nestedInstalls = toMint.reduce((n, r) => n + (r.installations?.length || 0), 0);
        // Parcel import auto-nests equipped installs on the cPaarcel (Aarcade nestEquippedAll).
        const result = await importCartridgePaarcels(currentAccount, {
          parcels: toMint.map((r) => ({
            realmTokenId: r.realmTokenId,
            installations: r.installations,
          })),
          cartridgeId,
          network: net,
        });
        if (!result.ok && !(Number(result.imported) > 0 || Number(result.alreadyMinted) > 0)) {
          const msg = result.error || 'Failed importing parcels';
          setMintError(msg);
          toast.error(msg, { theme: 'dark' });
          return;
        }
        imported += Number(result.imported) || 0;
        alreadyMinted += Number(result.alreadyMinted) || 0;
        const apiFailed = Array.isArray(result.failed) ? result.failed : [];
        failedCount += apiFailed.length;
        const apiFailNote = apiFailed[0]?.error ? String(apiFailed[0].error) : '';
        userDispatch({
          type: 'UPDATE_USER_CARTRIDGE',
          cartridgeId: result.cartridgeId || cartridgeId,
          hasCartridge: true,
          parcelInventory: result.parcelInventory,
          installationInventory: result.installationInventory,
        });
        // Drop successfully imported / already-minted parcels from cart; keep failed for retry.
        const failedIds = new Set(
          apiFailed.map((f) => String(f.realmTokenId || '')).filter(Boolean),
        );
        const mintedRealmIds = new Set(
          toMint.filter((r) => !failedIds.has(r.realmTokenId)).map((r) => r.realmTokenId),
        );
        if (result.ok || imported + alreadyMinted > 0) {
          setPaarcelCartRows((prev) =>
            failedIds.size ? prev.filter((r) => failedIds.has(r.realmTokenId)) : [],
          );
          // Nested on parcel — drop matching parcel-equip lines from the install cart.
          setPaarcelInstallCartRows((prev) =>
            prev.filter(
              (r) =>
                !(r.source === 'parcel-equip' && mintedRealmIds.has(String(r.sourceRealmTokenId || ''))),
            ),
          );
        }
        if (apiFailed.length && imported + alreadyMinted === 0) {
          setMintError(apiFailNote || 'Failed importing parcels');
        } else if (apiFailed.length) {
          setMintError(
            `${apiFailed.length} parcel${apiFailed.length === 1 ? '' : 's'} failed: ${
              apiFailNote || 'import error'
            }`,
          );
        } else if (skipped.length && imported + alreadyMinted > 0) {
          setMintError(
            `${skipped.length} parcel${skipped.length === 1 ? '' : 's'} skipped — owned by another wallet.`,
          );
        }
      }
      if (paarcelInstallCartRows.length > 0) {
        const result = await importCartridgeInstallations(currentAccount, {
          installations: paarcelInstallCartRows.map((r) => ({
            itemTypeId: r.itemTypeId,
            kind: r.kind,
            balanceIndex: r.balanceIndex,
            sourceRealmTokenId: r.sourceRealmTokenId,
            x: r.x,
            y: r.y,
            name: r.name,
            installationType: r.installationType,
          })),
          cartridgeId,
          network: (currentNetwork === 'robinhood' || currentNetwork === 'bitcoin') ? 'base' : currentNetwork,
        });
        if (!result.ok && !(Number(result.imported) > 0 || Number(result.alreadyMinted) > 0)) {
          const msg = result.error || 'Failed importing installations';
          setMintError(msg);
          toast.error(msg, { theme: 'dark' });
          return;
        }
        imported += Number(result.imported) || 0;
        alreadyMinted += Number(result.alreadyMinted) || 0;
        failedCount += Array.isArray(result.failed) ? result.failed.length : 0;
        userDispatch({
          type: 'UPDATE_USER_CARTRIDGE',
          cartridgeId: result.cartridgeId || cartridgeId,
          hasCartridge: true,
          parcelInventory: result.parcelInventory,
          installationInventory: result.installationInventory,
        });
        setPaarcelInstallCartRows([]);
      }
      if (imported + alreadyMinted > 0) {
        const nestNote =
          nestedInstalls > 0 ? ` · ${nestedInstalls} nested install${nestedInstalls === 1 ? '' : 's'}` : '';
        const failNote = failedCount > 0 ? ` · ${failedCount} skipped` : '';
        toast.success(
          `Minted ${imported} item${imported === 1 ? '' : 's'}${
            alreadyMinted ? ` · ${alreadyMinted} already owned` : ''
          }${nestNote}${failNote}`,
          { theme: 'dark' },
        );
      }
      if (cartridgeId) {
        const refreshed = await getCartridgePaarcels(currentAccount, cartridgeId);
        if (refreshed.ok) {
          userDispatch({
            type: 'UPDATE_USER_CARTRIDGE',
            parcelInventory: refreshed.parcelInventory,
            installationInventory: refreshed.installationInventory,
          });
        }
      }
    } finally {
      setMinting(false);
    }
  };

  /** Import selected/all mintable wearables grouped by source gotchi (stacks across sources). */
  const handleMintWearableRows = async (rows: MintableWearableRow[]) => {
    if (minting || !currentAccount || rows.length === 0) return;
    const queue = rows.filter((r) => !r.alreadyMinted);
    if (queue.length === 0) {
      toast.info('Selected wearables are already minted', { theme: 'dark' });
      return;
    }

    const bySource = new Map<string, MintableWearableRow[]>();
    for (const row of queue) {
      const key = `${row.bindKind}:${row.sourceTokenId}`;
      const list = bySource.get(key) || [];
      list.push(row);
      bySource.set(key, list);
    }

    setMinting(true);
    setMintError(null);
    let imported = 0;
    let alreadyMinted = 0;
    try {
      const groups = Array.from(bySource.values());
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const first = group[0];
        toast.info(
          `Minting wearables ${i + 1}/${groups.length} · from #${first.sourceTokenId}`,
          { theme: 'dark' },
        );
        const result = await importCartridgeWearables(currentAccount, {
          sourceTokenId: first.sourceTokenId,
          items: group.map((r) => ({ itemTypeId: r.itemTypeId, slotIndex: r.slotIndex })),
          bindKind: first.bindKind,
          cartridgeId,
          network: currentNetwork,
        });
        if (!result.ok) {
          const msg = result.error || `Failed importing from #${first.sourceTokenId}`;
          setMintError(msg);
          toast.error(msg, { theme: 'dark' });
          break;
        }
        imported += Number(result.imported) || 0;
        alreadyMinted += Number(result.alreadyMinted) || 0;
        userDispatch({
          type: 'UPDATE_USER_CARTRIDGE',
          cartridgeId: result.cartridgeId || cartridgeId,
          hasCartridge: true,
          wearableInventory: result.wearableInventory,
        });
      }
      if (imported + alreadyMinted > 0) {
        toast.success(
          `Minted ${imported} cWearable${imported === 1 ? '' : 's'}${
            alreadyMinted ? ` · ${alreadyMinted} already owned` : ''
          }`,
          { theme: 'dark' },
        );
        setWearableCartRows([]);
      }
      // Refresh inventory so left stacks / right mint list stay in sync.
      if (cartridgeId) {
        const refreshed = await getCartridgeWearables(currentAccount, cartridgeId);
        if (refreshed.ok) {
          userDispatch({
            type: 'UPDATE_USER_CARTRIDGE',
            wearableInventory: refreshed.wearableInventory,
          });
        }
      }
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

    // Soft-launch: union minted cPaarcels so build rights work even if diamond ownership fetch misses them.
    const cPaarcelOwned = cPaarcelsToGotchiverseParcels(parcelInventory, currentAccount || undefined);
    if (cPaarcelOwned.length) {
      const seen = new Set(
        (ownedParcels || []).map((p) => String(p.tokenId ?? p.id ?? '')).filter(Boolean),
      );
      const extras: ContractParcel[] = [];
      for (const c of cPaarcelOwned) {
        const tid = String(c.tokenId ?? c.id ?? '');
        if (!tid || seen.has(tid)) continue;
        seen.add(tid);
        extras.push({
          id: tid,
          tokenId: tid,
          parcelId: String(c.parcelId || ''),
          parcelHash: c.parcelHash,
          district: Number(c.district) || 0,
          owner: currentAccount,
        });
      }
      if (extras.length) {
        ownedParcels = _.concat(ownedParcels || [], extras);
      }
    }

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
      <NotificationStack />
      <MintGhostOverlay
        open={Boolean(mintGhost)}
        label={mintGhost?.label}
        progress={mintGhost?.progress}
      />
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
            <div className={`desktop-view${mintMode ? ' mint-layout' : ''}`} ref={containerRef}>
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
                selectedPaarcelId={selectedPaarcelId}
                onViewPaarcel={(realmTokenId) => {
                  if (entering || minting) return;
                  setSelectedPaarcelId(realmTokenId);
                }}
                onMintCartridgeClick={handleMintCartridgeClick}
                onManageWearablesClick={() => {
                  if (entering) return;
                  void handleManageWearablesClick();
                }}
                onManagePaarcelsClick={() => {
                  if (entering) return;
                  void handleManagePaarcelsClick();
                }}
                onManageInstallationsClick={() => {
                  if (entering) return;
                  void handleManageInstallationsClick();
                }}
                onManageCaavegotchisClick={() => {
                  if (entering || minting) return;
                  enterCaavegotchiStep();
                }}
                onManageCaavegotchiClick={(gotchi) => {
                  if (entering) return;
                  // Keep manage mint rail open; center follows this cAavegotchi (eager + URL).
                  onSelectedGotchiChange?.(gotchi);
                  void router.push(
                    {
                      pathname: '/',
                      query: { ...router.query, gotchi: gotchi.id },
                    },
                    undefined,
                    { scroll: false },
                  );
                  const coll = collateralFromSimId(gotchi.cartridgeCollateral);
                  setSelectedWalletGotchi(null);
                  if (coll) setSelectedCollateral(coll);
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
                <div className="selected-gotchi-container mint-preview" tabIndex={0}>
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
                      <h4>
                        {mintPreviewTip?.title ? <SoftCText>{mintPreviewTip.title}</SoftCText> : null}
                      </h4>
                    </div>
                    <p className="gotchi-caption">
                      {mintPreviewTip?.caption ? <SoftCText>{mintPreviewTip.caption}</SoftCText> : null}
                    </p>
                  </div>
                  {mintPreviewTip ? (
                    <div className="mint-preview-tip" role="tooltip">
                      <span className="tip-title">
                        <SoftCText>{mintPreviewTip.title}</SoftCText>
                      </span>
                      <span className="tip-caption">
                        <SoftCText>{mintPreviewTip.caption}</SoftCText>
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {mintStep === 'wearables' && currentNetwork && globalProvider && (
                <div className="selected-gotchi-container mint-catalog">
                  <WearableMintGallery
                    cartKeys={wearableCartKeys}
                    onAddToCart={addWearableToCart}
                    onAddAllToCart={addAllWearablesToCart}
                    minting={minting}
                  />
                </div>
              )}

              {mintStep === 'paarcels' && currentNetwork && globalProvider && (
                <div className="selected-gotchi-container mint-catalog">
                  {selectedPaarcel ? (
                    <PaarcelDetailPanel
                      parcel={selectedPaarcel}
                      onBack={() => setSelectedPaarcelId(null)}
                    />
                  ) : (
                    <PaarcelMintGallery
                      cartParcelKeys={paarcelCartKeys}
                      cartInstallKeys={paarcelInstallCartKeys}
                      onAddParcel={(row) => {
                        void addPaarcelToCart(row);
                      }}
                      onAddAllParcels={(rows) => {
                        void addAllPaarcelsToCart(rows);
                      }}
                      onAddInstallation={addPaarcelInstallToCart}
                      onAddAllParcelInstalls={addAllPaarcelInstallsToCart}
                      onAddAllWalletInstalls={addAllPaarcelInstallsToCart}
                      minting={minting}
                    />
                  )}
                </div>
              )}

              {mintStep === 'installations' && (
                <div className="selected-gotchi-container mint-catalog">
                  <InstallationInventoryGallery />
                </div>
              )}

              {mintStep === 'wearables-import' && currentNetwork && globalProvider && (
                <div className="selected-gotchi-container mint-preview" tabIndex={0}>
                  <div className="gotchi">
                    {importSourceGotchi || selectedWalletGotchi ? (
                      <GotchiSVG
                        tokenId={(importSourceGotchi || selectedWalletGotchi)?.id}
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
                        <Image alt="" src={GotchiLoading} layout="fill" objectFit="contain" />
                      </div>
                    )}
                  </div>
                  <div className="glow"></div>
                  <div className="gotchi-name-container">
                    <div className="gotchi-name">
                      <h4>
                        {mintPreviewTip?.title ? <SoftCText>{mintPreviewTip.title}</SoftCText> : null}
                      </h4>
                    </div>
                    <p className="gotchi-caption">
                      {mintPreviewTip?.caption ? <SoftCText>{mintPreviewTip.caption}</SoftCText> : null}
                    </p>
                  </div>
                  {mintPreviewTip ? (
                    <div className="mint-preview-tip" role="tooltip">
                      <span className="tip-title">
                        <SoftCText>{mintPreviewTip.title}</SoftCText>
                      </span>
                      <span className="tip-caption">
                        <SoftCText>{mintPreviewTip.caption}</SoftCText>
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {mintStep === 'caavegotchi' && currentNetwork && globalProvider && (
                <div className="selected-gotchi-container mint-preview" tabIndex={0}>
                  <div className="gotchi">
                    {selectedWalletGotchi ? (
                      <GotchiSVG
                        key={previewArtKey}
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
                          key={previewArtKey}
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
                        {mintPreviewTip?.title ? <SoftCText>{mintPreviewTip.title}</SoftCText> : null}
                      </h4>
                    </div>
                    <p className="gotchi-caption">
                      {mintPreviewTip?.caption ? <SoftCText>{mintPreviewTip.caption}</SoftCText> : null}
                    </p>
                  </div>
                  {mintPreviewTip ? (
                    <div className="mint-preview-tip" role="tooltip">
                      <span className="tip-title">
                        <SoftCText>{mintPreviewTip.title}</SoftCText>
                      </span>
                      <span className="tip-caption">
                        <SoftCText>{mintPreviewTip.caption}</SoftCText>
                      </span>
                    </div>
                  ) : null}
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
                          key={`${previewArtKey}-${enterPortal ? 'back' : 'front'}`}
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
                        key={selectedGotchi.id}
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

              <div
                className={`gotchi-details${mintMode ? ' mint-mode' : ''}${
                  mintStep === 'wearables' || mintStep === 'paarcels' ? ' mint-cart' : ''
                }`}
              >
                {mintStep === 'cartridge' && currentNetwork && globalProvider ? (
                  <CartridgeMintPanel
                    network={currentNetwork}
                    onMint={handleEnsureCartridge}
                    minting={minting}
                    mintError={mintError}
                  />
                ) : mintStep === 'caavegotchi' && currentNetwork && globalProvider ? (
                  <CollateralGotchiGallery
                    network={currentNetwork}
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
                    onMintWalletGotchi={(opts) => handleMintWalletGotchi(opts)}
                    onMintAllOwnedWalletGotchis={(opts) => handleMintAllOwnedWalletGotchis(opts)}
                  />
                ) : mintStep === 'wearables-import' &&
                  importSourceGotchi &&
                  currentNetwork &&
                  globalProvider ? (
                  <WearableImportPanel
                    sourceGotchi={importSourceGotchi}
                    bindKind={importBindKind}
                    onImport={handleImportWearables}
                    onSkip={() => finishWithHero(pendingHeroAfterImport)}
                    importing={minting}
                    importError={mintError}
                  />
                ) : mintStep === 'wearables' && currentNetwork && globalProvider ? (
                  <WearableCart
                    cartRows={wearableCartRows}
                    availableRows={availableWearableRows}
                    onSetQuantity={setWearableCartQuantity}
                    onRemoveLine={removeWearableCartLine}
                    onClear={() => setWearableCartRows([])}
                    onCheckout={() => handleMintWearableRows(wearableCartRows)}
                    minting={minting}
                    mintError={mintError}
                  />
                ) : mintStep === 'paarcels' && currentNetwork && globalProvider ? (
                  <PaarcelCart
                    cartParcels={paarcelCartRows}
                    cartInstallations={paarcelInstallCartRows}
                    onRemoveParcel={(key) =>
                      setPaarcelCartRows((prev) => prev.filter((r) => r.key !== key))
                    }
                    onRemoveInstallation={(key) =>
                      setPaarcelInstallCartRows((prev) => prev.filter((r) => r.key !== key))
                    }
                    onClear={() => {
                      setPaarcelCartRows([]);
                      setPaarcelInstallCartRows([]);
                    }}
                    onCheckout={() => handleMintPaarcelCart()}
                    minting={minting}
                    mintError={mintError}
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
            <h3 className="manage-hero-title">
              <span className="title-lead">Manage</span>{' '}
              <SoftCText>cAavegotchi</SoftCText>
            </h3>
            <p className="manage-hero-name">
              {manageHero.name || (
                <>
                  <SoftCText>cAavegotchi</SoftCText> #{manageHero.id}
                </>
              )}
            </p>
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
