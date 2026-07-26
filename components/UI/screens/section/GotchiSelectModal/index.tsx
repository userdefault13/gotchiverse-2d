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
import {
  bindAarcadeOwnedGotchi,
  bindAarcadeRentalGotchi,
  bindAarcadeStarter,
  ensureAarcadeCartridge,
  getAarcadeCartridgeStatus,
  getCartridgeWearables,
  importCartridgeWearables,
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
  normalizeCWearables,
  wearablesFromCartridgeSnapshot,
  type MintableWearableRow,
} from 'helpers/cartridgeWearable.helper';


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
  const [{ hasCartridge, cartridgeId, cartridgeHeroes, userAavegotchis }, userDispatch] = useUser();

  const { portalOpen, sending } = useAavegotchiSound();

  // TODO: GAME_CONFIG.demoGotchiMode should be pulled from the API before page load and not start with the the default constant version here
  const [storedId, setStoredId] = useState<string>();
  const [enterPortal, setEnterPortal] = useState(false);
  const [parcel, setParcel] = useState<JsonParcel>(null);
  const [event, setEvent] = useState<RealmEvent>();
  const [entering, setEntering] = useState(false);
  const [spawnSelectorOpen, setSpawnSelectorOpen] = useState(false);
  const [isEvent, setIsEvent] = useState(false);
  /** Right-rail modes for soft-launch mint / wearables. */
  const [mintStep, setMintStep] = useState<
    'cartridge' | 'caavegotchi' | 'wearables-import' | 'wearables' | null
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
    // Mint/manage modes: compact center preview so left + right rails keep room.
    if (mintMode) return isDesktop ? 22 : 18;
    if (!selectedGotchi) return 0;
    if (isTrueSpectator(selectedGotchi.isSpectator)) return 30;
    return isDesktop ? 42 : 36;
  }, [isDesktop, selectedGotchi, mintMode]);

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
  };

  const finishWithHero = (hero: CartridgeHero | null) => {
    resetMintFlow();
    if (hero && currentAccount) {
      handleGotchiSelect(mapCartridgeHeroToGotchi(hero, currentAccount));
    }
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
    if (!currentAccount || !hero) return { ok: true as const, imported: 0, equipped: 0, alreadyMinted: 0 };
    const bindKind = gotchi.isLent ? 'rental' : 'owned';
    const gear = listEquippedWearableSlots(gotchi, bindKind);
    if (gear.length === 0) return { ok: true as const, imported: 0, equipped: 0, alreadyMinted: 0 };
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
    setMinting(true);
    setMintError(null);
    try {
      const result = await bindWalletGotchi(selectedWalletGotchi);
      if (!result.ok || !result.cartridgeId) {
        const msg = result.error || 'Mint failed';
        setMintError(msg);
        toast.error(msg, { theme: 'dark' });
        return;
      }
      const heroes = await syncCartridgeFromResult(result);
      const role = selectedWalletGotchi.isLent ? 'borrower' : 'owner';
      toast.success(
        result.alreadyBound
          ? `Already minted #${selectedWalletGotchi.id}`
          : `Minted #${selectedWalletGotchi.id} free (${role})`,
        { theme: 'dark' },
      );
      const bound =
        heroes.find((h) => String(h.sourceTokenId) === String(selectedWalletGotchi.id)) ||
        heroes[heroes.length - 1] ||
        null;
      const bindKind = selectedWalletGotchi.isLent ? 'rental' : 'owned';
      const gear = listEquippedWearableSlots(selectedWalletGotchi, bindKind);
      if (withWearables && gear.length > 0) {
        toast.info(`Minting & equipping ${gear.length} wearable${gear.length === 1 ? '' : 's'}…`, {
          theme: 'dark',
        });
        const wear = await importAndEquipForGotchi(selectedWalletGotchi, bound, result.cartridgeId);
        if (!wear.ok) {
          setMintError(wear.error || 'Wearable mint/equip failed');
          toast.error(wear.error || 'Wearable mint/equip failed', { theme: 'dark' });
          // Gotchi minted; leave player on the hero even if gear failed.
          finishWithHero(bound);
          return;
        }
        toast.success(
          `Equipped ${wear.equipped} cWearable${wear.equipped === 1 ? '' : 's'}${
            wear.imported ? ` · ${wear.imported} newly minted` : ''
          }${wear.alreadyMinted ? ` · ${wear.alreadyMinted} already owned` : ''}`,
          { theme: 'dark' },
        );
      }
      finishWithHero(bound);
    } finally {
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
    let okCount = 0;
    let skipCount = 0;
    let gearMinted = 0;
    let gearEquipped = 0;
    let lastHeroes: CartridgeHero[] = cartridgeHeroes || [];
    try {
      for (let i = 0; i < queue.length; i++) {
        const gotchi = queue[i];
        toast.info(`Minting owned ${i + 1}/${queue.length} · #${gotchi.id}`, { theme: 'dark' });
        const result = await bindWalletGotchi(gotchi);
        if (!result.ok || !result.cartridgeId) {
          const msg = result.error || `Failed on #${gotchi.id}`;
          setMintError(msg);
          toast.error(msg, { theme: 'dark' });
          break;
        }
        lastHeroes = await syncCartridgeFromResult(result);
        if (result.alreadyBound) skipCount += 1;
        else okCount += 1;

        if (withWearables) {
          const bound =
            lastHeroes.find((h) => String(h.sourceTokenId) === String(gotchi.id)) ||
            lastHeroes[lastHeroes.length - 1] ||
            null;
          const wear = await importAndEquipForGotchi(gotchi, bound, result.cartridgeId);
          if (!wear.ok) {
            setMintError(wear.error || `Wearables failed on #${gotchi.id}`);
            toast.error(wear.error || `Wearables failed on #${gotchi.id}`, { theme: 'dark' });
            break;
          }
          gearMinted += wear.imported;
          gearEquipped += wear.equipped;
        }
      }
      if (okCount + skipCount > 0) {
        toast.success(
          `Minted ${okCount} owned gotchi${okCount === 1 ? '' : 's'}${
            skipCount ? ` · ${skipCount} already on cartridge` : ''
          }${
            withWearables && gearEquipped
              ? ` · ${gearEquipped} wearables equipped (${gearMinted} new)`
              : ''
          }`,
          { theme: 'dark' },
        );
      }
      if (lastHeroes.length > 0 && okCount > 0) {
        resetMintFlow();
        const last = lastHeroes[lastHeroes.length - 1];
        handleGotchiSelect(mapCartridgeHeroToGotchi(last, currentAccount));
      }
    } finally {
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
      finishWithHero(pendingHeroAfterImport);
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
                onManageWearablesClick={() => {
                  if (entering) return;
                  void handleManageWearablesClick();
                }}
                onManageCaavegotchisClick={() => {
                  if (entering || minting) return;
                  enterCaavegotchiStep();
                }}
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

              {(mintStep === 'wearables-import' || mintStep === 'wearables') &&
                currentNetwork &&
                globalProvider && (
                  <div className="selected-gotchi-container mint-preview">
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
                          {mintStep === 'wearables'
                            ? 'cWearables'
                            : importSourceGotchi?.name || `#${importSourceGotchi?.id || ''}`}
                        </h4>
                      </div>
                      <p className="gotchi-caption">
                        {mintStep === 'wearables'
                          ? 'Mint from bound gotchis · equip on Aarcade'
                          : 'Choose equipped wearables to mint as cWearables'}
                      </p>
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
                  <WearableMintGallery
                    onMintSelected={handleMintWearableRows}
                    onMintAll={handleMintWearableRows}
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
