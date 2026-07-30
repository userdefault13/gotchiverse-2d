import { aavegotchiSvgSubgraph, gotchiverseSubgraph, varsForNetwork } from 'shared_code/web3/shared.const.web3';
import { useSubgraph } from 'web3/subgraph';
import { getAavegotchiSvg, getAllAavegotchisOfOwner, getAavegotchiSideSVGs, getAavegotchiLastChanneled } from 'web3/subgraph/queries';
import { ethers } from 'ethers';
import type {
  AavegotchiObject,
  ItemObject,
  SelectedPlayer,
  GotchiUrl,
  HandWearable,
  Player,
  Aavegotchi,
  Tuple,
  NetworkNames,
  TransactionHistory,
  GotchiverseAavegotchi,
} from 'types';
import ItemsFacet from 'web3/abi/aavegotchi/ItemsFacet.json';
import SvgFacet from 'web3/abi/aavegotchi/SvgFacet.json';
import Items from 'data/items.json';
import SvgViewFacet from 'web3/abi/aavegotchi/SvgViewFacet.json';
import { getAlchemicaBalances, getContract, useDiamondCall } from 'web3/contract';
import { Action } from 'contexts/NotificationContext/reducer';
import _ from 'lodash';

import {
  addStyles,
  basicUpDown,
  raiseHands,
  neutralMouth,
  removeShadow as removeShadowCSS,
  removeBackground as removeBackgroundCSS,
  removeRightHandWearables,
  removeLeftHandWearables,
  replaceParts,
} from 'overrides/gotchiStyles';
import { collateralByAddress, maxQuantityToRarity } from './ethers.helper';
import { traitNumber } from './composeGotchi';
import React from 'react';
import { showNotificationWithTimeout } from 'contexts/NotificationContext/actions';
import { secondsUntilGotchiCanChannel } from './parcels.helper';
import GlobalState from 'contexts/GlobalState';
import { defaultGotchi } from './aavegotchi/svg';
import { ObservorIdle, ObservorLive } from 'assets';
import { scene } from 'components/controllers/SceneController';
import { CollateralObject, collateralObjects } from './vars';
import { formatUnits } from 'ethers/lib/utils';
import { formatDigit } from './functions';
import { collateralFromSimId, parseCartridgeHeroCollateral } from './cartridgeHero.helper';
import { fetchCartridgeHeroSideSVGs, svgSidesToPngSpritesheet, buildCollateralDefaultSideSvgs } from './collateralPreview';

export async function fetchAndSetGlobalAavegotchis(
  updateAddresses: boolean,
  filter?: {
    sortValue?: string;
    searchValue?: string;
    channelReady?: boolean;
  },
): Promise<void> {
  // RH aarena path: no Base/Matic diamond or core subgraph ownership.
  if (GlobalState.WEB3.state.currentNetwork === 'robinhood') {
    GlobalState.USER.dispatch({
      type: 'UPDATE_USER_AAVEGOTCHIS',
      userAavegotchis: [],
    });
    return;
  }

  const res = await fetchAavegotchis(GlobalState.WEB3.state.currentAccount, filter);

  // console.log('@fetchAavegotchis: res', res);

  if (!res) return;

  // Gotchiverse Envio indexes lastChanneledAlchemica on parcels, not gotchis yet.
  // Soft-fail so wallet gotchi list still loads without channel enrichment.
  let gotchiverseRes: { gotchis?: Array<{ lastChanneledAlchemica: string; id: string }> } = { gotchis: [] };
  if (res.length) {
    try {
      const gotchiverseQuery = getAavegotchiLastChanneled(res.map((gotchi) => Number(gotchi.id)));
      gotchiverseRes = await useSubgraph<{ gotchis: Array<{ lastChanneledAlchemica: string; id: string }> }>(
        gotchiverseQuery,
        gotchiverseSubgraph,
      );
    } catch (error) {
      console.warn('@fetchAndSetGlobalAavegotchis: gotchi channel enrichment skipped', error);
    }
  }
  const gotchis = [];

  const gotchiTraits = await getGotchiCombatTraits(GlobalState.WEB3.state.currentAccount);

  for (const gotchi of res) {
    let secondsUntilChannel;

    const gotchiverseData = gotchiverseRes?.gotchis?.find((item) => item.id === gotchi.id);
    if (gotchiverseData) secondsUntilChannel = secondsUntilGotchiCanChannel(gotchiverseData.lastChanneledAlchemica);
    if (filter?.channelReady && secondsUntilChannel) continue;

    const serverTraits = gotchiTraits?.data?.gotchis?.[gotchi.id];
    const clientTraits = serverTraits ? null : computeClientCombatTraits(gotchi);

    const gotchiverseAavegotchi: GotchiverseAavegotchi = {
      ...gotchi,
      ...(serverTraits || clientTraits || {}),
      secondsUntilChannel,
      isLent: gotchi.originalOwner.id !== gotchi.owner.id,
      lastChanneledAlchemica: gotchiverseData?.lastChanneledAlchemica,
      readyToChannel: !secondsUntilChannel,
      originalOwnerId: gotchi.originalOwner.id,
    };
    gotchis.push(gotchiverseAavegotchi);
  }
  console.log('FETCHED USER_AAVEGOTCHIS:', gotchis);
  GlobalState.USER.dispatch({
    type: 'UPDATE_USER_AAVEGOTCHIS',
    userAavegotchis: gotchis,
  });

  if (updateAddresses) {
    const groupByOwner = _.groupBy(gotchis, 'originalOwnerId');
    const addresses = _.keys(groupByOwner);
    console.log('FETCHED ACCOUNTS:', addresses);
    GlobalState.USER.dispatch({
      type: 'UPDATE_ADDRESSES',
      addresses: addresses,
    });
    GlobalState.USER.dispatch({
      type: 'UPDATE_PARCELS_ACCESS_OWNERS',
      parcelAccessOwners: addresses,
    });
    if (gotchiTraits?.data) {
      const { playerWallet } = gotchiTraits.data;
      GlobalState.REALM.dispatch({
        type: 'UPDATE_ONCHAIN_WALLET',
        onChainWallet: playerWallet,
      });
    }
  }

  // if (storedId) handleSelect(_.find(gotchis, ({ id }) => id === storedId));
}

// export async function fetchOwnedParcels(currentAccount: string, currentNetwork: string): Promise<string[]> {
//   const query = getUserParcelsQuery(currentAccount);
//   // TODO: add proper response type validation here
//   const { user } = await useSubgraph<any>(query, gotchiverseSubgraph);

//   if (user?.ownedParcels) {
//     const ownedParcelsIds = user.ownedParcels.map(({ parcelId }) => parcelId);
//     return ownedParcelsIds;
//   }
//   return [];
// }

// Aavegotchi Subgraph/Contract Aavegotchis
export async function fetchAavegotchis(
  owner: string,
  filter?: {
    sortValue?: string;
    searchValue?: string;
    channelReady?: boolean;
  },
): Promise<Aavegotchi[]> {
  try {
    const query = getAllAavegotchisOfOwner(owner, filter?.sortValue, filter?.searchValue);
    const res = await useSubgraph<{ aavegotchis: Aavegotchi[] }>(query);
    return res.aavegotchis;
  } catch (error) {
    const network = GlobalState.WEB3.state.currentNetwork;
    // Base soft-launch: never fall back to diamond RPC. Subgraph/proxy failures used to
    // call allAavegotchisOfOwner + per-gotchi lending reads against public mainnet.base.org
    // → ABI noise + 429 floods. Wallet gotchis come from subgraph / cartridge, not L1 scan.
    if (network === 'base' || network === 'robinhood') {
      console.error(
        '@fetchAavegotchis:ERR (Base) — subgraph failed; skipping contract fallback to avoid RPC 429',
        error,
      );
      return [];
    }
    console.error('@fetchAavegotchis:ERR', error, 'Fetching from contract...');
    const res = await fetchContractUserAavegotchis(owner, GlobalState.WEB3.state.maticProvider);
    return res ?? [];
  }
}

const fetchContractUserAavegotchis = async (owner: string, provider: ethers.providers.Provider) => {
  // fetch all contract owner aavegotchis including portals
  try {
    const network =
      GlobalState.WEB3.state.currentNetwork === 'base' || GlobalState.WEB3.state.currentNetwork === 'robinhood'
        ? 'base'
        : 'matic';
    const res = await useDiamondCall<AavegotchiObject[]>(provider, network, {
      name: 'allAavegotchisOfOwner',
      parameters: [owner],
    });
    // console.log('@fetchContractUserAavegotchis:', res);
    const filteredGotchis = res.filter((gotchi) => Number(gotchi.status) === 3);
    const gotchis: Aavegotchi[] = [];
    for (let i = 0; i < filteredGotchis.length; i++) gotchis[i] = await transformContractRes(filteredGotchis[i]);
    // gotchis = res.filter((gotchi) => Number(gotchi.status) === 3).map((gotchi) => await transformContractRes(gotchi));
    // console.log("'@fetchContractUserAavegotchis: Transformed", gotchis);
    return gotchis;
  } catch (error) {
    console.error('@fetchContractUserAavegotchis: ERR', error);
  }
};

export const transformContractRes = async (res: AavegotchiObject): Promise<Aavegotchi> => {
  const gotchiLendingContract = getContract('matic', GlobalState.WEB3.state.maticProvider, 'gotchiLending');
  if (!gotchiLendingContract) return;
  let lendingDetails;
  // const isLent = await gotchiLendingContract.isAavegotchiLent(res.tokenId.toString());
  try {
    lendingDetails = await gotchiLendingContract.getGotchiLendingFromToken(res.tokenId.toString());
  } catch (error) {
    // gotchi not borrowed
  }

  return {
    withSetsNumericTraits: res.modifiedNumericTraits as Tuple<number, 6>,
    numericTraits: res.numericTraits as Tuple<number, 6>,
    id: res.tokenId.toString(),
    withSetsRarityScore: res.modifiedRarityScore.toString(),
    baseRarityScore: res.baseRarityScore.toString(),
    originalOwner: {
      id: lendingDetails?.originalOwner?.toLowerCase() || res.owner.toLowerCase(),
    },
    owner: {
      id: res.owner.toLowerCase(),
    },
    escrow: res.escrow,
    name: res.name,
    equippedWearables: res.equippedWearables as Tuple<number, 16>,
    level: res.level.toString(),
    experience: res.experience.toString(),
    stakedAmount: res.stakedAmount.toString(),
    collateral: res.collateral,
    kinship: res.kinship.toString(),
  };
};
// fetch aavegotchiSides from SvgViewFacet aavegotchiDiamond contract
async function fetchContractAavegotchiSides(tokenId: string) {
  try {
    const network = (GlobalState.WEB3.state.currentNetwork || process.env.REALM_NETWORK || process.env.NETWORK || 'base') as NetworkNames;
    const vars = varsForNetwork(network);
    const provider =
      network === 'matic' && GlobalState.WEB3.state.maticProvider
        ? GlobalState.WEB3.state.maticProvider
        : GlobalState.WEB3.state.globalProvider;
    const svgContract = new ethers.Contract(vars.aavegotchiDiamond, SvgViewFacet.abi, provider);
    const svgs = await svgContract.getAavegotchiSideSvgs(tokenId);

    return svgs;
  } catch (error) {
    console.error('@fetchContractAavegotchiSides:ERR return default gotchi', error);

    return defaultGotchi;
  }
}
export const getObservorSides = (): Tuple<string, 4> => {
  return [ObservorIdle, ObservorIdle, ObservorIdle, ObservorLive];
};

export const getDefaultGotchiURL = (): string => {
  const urlOptions = { removeShadow: true, removeBackground: true };
  const allSides = _.map(defaultGotchi, (svg) => _getMutateSVGBloblAavegotchiSVG(svg, urlOptions));
  const allSvgs = _.map(allSides, ({ svg }) => svg);
  const sprite = _aavegotchiSpriteSVG(allSvgs, 2);
  return sprite;
};

export async function fetchAavegotchiURL(gotchiData: SelectedPlayer | Player): Promise<GotchiUrl> {
  if (isTrueSpectator(gotchiData.isSpectator)) return { url: '', sprite: '' };

  const id = gotchiData.id;
  const selected = gotchiData as SelectedPlayer;
  const result = await fetchAavegotchiURLById(id, {
    cartridgeCollateral: selected.cartridgeCollateral || (selected.isCartridgeHero ? parseCartridgeHeroCollateral(id) : undefined),
    network: selected.network as NetworkNames | undefined,
    equippedWearables: selected.equippedWearables,
    traits: selected.withSetsNumericTraits,
    sourceTokenId: selected.cartridgeSourceTokenId,
    hauntId: selected.hauntId,
  });
  return result;
}

export async function fetchAavegotchiURLById(
  id: string,
  opts?: {
    cartridgeCollateral?: string;
    network?: NetworkNames;
    equippedWearables?: number[];
    traits?: number[];
    sourceTokenId?: string;
    hauntId?: number;
  },
): Promise<GotchiUrl> {
  const cartridgeCollateral = opts?.cartridgeCollateral || parseCartridgeHeroCollateral(id);
  const sideviewArray = await fetchAavegotchiSideSVGs(id, opts);
  const urlOptions = { removeShadow: true, removeBackground: true };

  // Mutate each aavegotchi side to get the final game result in both svg and url blob format
  const allSides = _.compact(
    _.map(sideviewArray, (svg) => {
      try {
        return _getMutateSVGBloblAavegotchiSVG(svg, urlOptions);
      } catch (e) {
        console.warn('@fetchAavegotchiURLById mutate side failed', id, e);
        return null;
      }
    }),
  );
  const allSvgs = _.map(allSides, ({ svg }) => svg).filter(Boolean) as string[];

  // Cartridge / soft-mint: PNG sheet for Phaser.
  // 1) compose/RPC sides (with cWearables)  2) recolor default  3) stock defaultGotchi SVG sheet
  let sprite: string;
  if (cartridgeCollateral) {
    const coll = collateralFromSimId(cartridgeCollateral);
    const tryPng = async (sides: string[], label: string) => {
      const url = await svgSidesToPngSpritesheet(sides, { columns: 2 });
      console.log(`@fetchAavegotchiURLById png ok (${label})`, id);
      return url;
    };
    const composeCandidates = [
      // Prefer raw compose sides (bg already stripped); mutate can fight class fills.
      ...(Array.isArray(sideviewArray) ? sideviewArray.map((s) => String(s || '')).filter((s) => s.length >= 80) : []),
    ];
    const mutatedCandidates = allSvgs.filter((s) => s.length >= 80);

    try {
      if (composeCandidates.length >= 4) {
        sprite = await tryPng(composeCandidates.slice(0, 4), 'compose');
      } else {
        throw new Error(`compose sides incomplete (${composeCandidates.length})`);
      }
    } catch (composeErr) {
      console.warn('@fetchAavegotchiURLById compose png failed', id, composeErr);
      try {
        if (mutatedCandidates.length >= 4) {
          sprite = await tryPng(mutatedCandidates.slice(0, 4), 'compose-mutated');
        } else {
          throw composeErr;
        }
      } catch (mutatedErr) {
        console.warn('@fetchAavegotchiURLById mutated png failed', id, mutatedErr);
        try {
          if (coll) {
            sprite = await tryPng(buildCollateralDefaultSideSvgs(coll), 'recolor-default');
          } else {
            throw new Error('no collateral for recolor fallback');
          }
        } catch (recolorErr) {
          console.warn('@fetchAavegotchiURLById recolor png failed, using defaultGotchi sheet', id, recolorErr);
          sprite = getDefaultGotchiURL();
        }
      }
    }
  } else {
    sprite = _aavegotchiSpriteSVG(allSvgs, 2);
  }
  // console.log('sprite4Sideviews', sprite);

  // strippedGotchi = svg;
  // if (gotchiData.leftHand?.type) {
  //   leftHand = extractParts(svg, 'g.wearable-hand-left', false, gotchiData.leftHand.dimensions.width, gotchiData.leftHand.dimensions.height);
  //   gotchiSLH = deleteParts(svg, 'g.wearable-hand-left');
  //   strippedGotchi = gotchiSLH;
  //   gotchiSLH = _getMutateSVGBloblAavegotchiSVG(gotchiSLH, urlOptions);
  //   // console.log("leftHand", leftHand);
  //   spritesArray.push(gotchiSLH.svg);
  // } else {
  //   spritesArray.push(gotchi.svg);
  // }

  // if (gotchiData.rightHand?.type) {
  //   rightHand = extractParts(svg, 'g.wearable-hand-right', true, gotchiData.rightHand.dimensions.width, gotchiData.rightHand.dimensions.height);
  //   gotchiSRH = deleteParts(svg, 'g.wearable-hand-right');
  //   strippedGotchi = deleteParts(strippedGotchi, 'g.wearable-hand-right');
  //   gotchiSRH = _getMutateSVGBloblAavegotchiSVG(gotchiSRH, urlOptions);
  //   // console.log("rightHand", rightHand);
  //   spritesArray.push(gotchiSRH.svg);
  // } else {
  //   spritesArray.push(gotchi.svg);
  // }
  // spritesArray.push(...sidesSvgs);

  // strippedGotchi = _getMutateSVGBloblAavegotchiSVG(strippedGotchi, urlOptions);
  // spritesArray.push(strippedGotchi.svg);
  // const sprite = _aavegotchiSpriteSVG(spritesArray, 2);
  if (!allSides[0]?.url) {
    console.log(`no url for gotchi id ${id}`);
  }
  const frontUrl =
    allSides[0]?.url ||
    (typeof sideviewArray?.[0] === 'string' && sideviewArray[0].length > 80
      ? URL.createObjectURL(new Blob([sideviewArray[0]], { type: 'image/svg+xml' }))
      : '');
  return { url: frontUrl, sprite };
}

export const getOrFetchAavegotchiURL = async (playerId: string, callback): Promise<void> => {
  const textureLooksOk = (key: string): boolean => {
    if (!scene.textures.exists(key)) return false;
    const tex = scene.textures.get(key);
    if (!tex || tex.key === '__MISSING') return false;
    // Phaser includes __BASE; a 2×2 sheet should expose ≥4 named frames + base.
    const total = Number(tex.frameTotal ?? 0);
    return total >= 4;
  };

  if (textureLooksOk(playerId) || scene.loadedPlayerIds.includes(playerId)) {
    callback(scene.textures.get(playerId));
    return;
  }

  // Drop a registered-but-empty/corrupt sheet so we can rebuild (common for bad SVG sheets).
  if (scene.textures.exists(playerId) && !textureLooksOk(playerId)) {
    try {
      scene.textures.remove(playerId);
    } catch {
      /* ignore */
    }
  }

  try {
      const selected = GlobalState.REALM?.state?.selectedPlayer;
      const sameAsSelected = selected && String(selected.id) === String(playerId);
      const playerUrl = await fetchAavegotchiURLById(
        playerId,
        sameAsSelected
          ? {
              cartridgeCollateral: selected.cartridgeCollateral || parseCartridgeHeroCollateral(playerId),
              network: selected.network as NetworkNames | undefined,
              equippedWearables: selected.equippedWearables,
              traits: selected.withSetsNumericTraits,
              sourceTokenId: selected.cartridgeSourceTokenId,
              hauntId: selected.hauntId,
            }
          : {
              cartridgeCollateral: parseCartridgeHeroCollateral(playerId) || undefined,
            },
      );
      const spriteUrl = playerUrl?.sprite || getDefaultGotchiURL();
      scene.load.spritesheet(playerId, spriteUrl, {
        frameWidth: 64,
        frameHeight: 64,
      });
      let settled = false;
      const finish = (tex) => {
        if (settled) return;
        settled = true;
        scene.load.off(`filecomplete-spritesheet-${playerId}`, onDone);
        scene.load.off(`loaderror`, onErr);
        callback(tex);
      };
      const useDefault = () => {
        console.warn('getOrFetchAavegotchiURL: spritesheet failed, using defaultGotchi', playerId);
        if (textureLooksOk('defaultGotchi')) {
          finish(scene.textures.get('defaultGotchi'));
          return;
        }
        scene.load.spritesheet('defaultGotchi', getDefaultGotchiURL(), {
          frameWidth: 64,
          frameHeight: 64,
        });
        scene.load.once('complete', () => finish(scene.textures.get('defaultGotchi')));
        scene.load.start();
      };
      const onDone = () => {
        if (!textureLooksOk(playerId)) {
          try {
            scene.textures.remove(playerId);
          } catch {
            /* ignore */
          }
          useDefault();
          return;
        }
        finish(scene.textures.get(playerId));
      };
      const onErr = (file?: { key?: string }) => {
        if (file?.key && file.key !== playerId) return;
        useDefault();
      };
      scene.load.on(`filecomplete-spritesheet-${playerId}`, onDone);
      scene.load.on('loaderror', onErr);
      scene.load.start();
  } catch (err) {
    console.error('getOrFetchAavegotchiURL:ERR', err);
  }
};

export const isTrueSpectator = (isSpectator: boolean): boolean => {
  return isSpectator && !GlobalState.GAME.state.gameConfig.enableNakedGotchis;
};

export const isNaked = (isSpectator: boolean): boolean => {
  return isSpectator && GlobalState.GAME.state.gameConfig.enableNakedGotchis;
};

export const getSpectator = (currentAccount: string): Aavegotchi => {
  return {
    id: currentAccount.toLowerCase(),
    isSpectator: true,
    escrow: GlobalState.GAME.state.gameConfig.enableNakedGotchis ? '0x823CD4264C1b951C9209aD0DeAea9988fE8429bF' : '',
    withSetsNumericTraits: [0, 0, 0, 0, 0, 0],
    numericTraits: [0, 0, 0, 0, 0, 0],
    withSetsRarityScore: '0',
    baseRarityScore: '0',
    originalOwner: { id: currentAccount.toLowerCase() },
    owner: {
      id: currentAccount.toLowerCase(),
    },
    name: GlobalState.GAME.state.gameConfig.enableNakedGotchis ? 'Nakey Gotchi' : 'Observooor',
    borrowed: false,
    equippedWearables: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    level: '1',
    experience: '',
    stakedAmount: '',
    collateral: '',
    kinship: '',
  };
};

export const fetchAavegotchiSideSVGs = async (
  id: string,
  opts?: {
    cartridgeCollateral?: string;
    network?: NetworkNames;
    equippedWearables?: number[];
    traits?: number[];
    sourceTokenId?: string;
    hauntId?: number;
  },
): Promise<string[]> => {
  // Soft-launch cartridge hero — Base preview art (+ equipped cWearables).
  const simCollateral = opts?.cartridgeCollateral || parseCartridgeHeroCollateral(id);
  if (simCollateral) {
    const equipKey = (opts?.equippedWearables || []).map((n) => Number(n) || 0).join(',');
    const traitKey = (opts?.traits || []).map((n) => traitNumber(n, 50)).join(',');
    const sourceKey = String(opts?.sourceTokenId || '');
    const hauntKey = Number(opts?.hauntId) === 2 ? 'h2' : Number(opts?.hauntId) === 1 ? 'h1' : 'h?';
    const cacheKey = `cartridge:base-sides-v13:${simCollateral}:src${sourceKey}:${hauntKey}:w${equipKey}:t${traitKey}`;
    if (GlobalState.CHAT.state.gotchiSides[cacheKey]) {
      return GlobalState.CHAT.state.gotchiSides[cacheKey];
    }
    const collateral = collateralFromSimId(simCollateral);
    if (collateral) {
      const svgs = await fetchCartridgeHeroSideSVGs(
        collateral,
        opts?.network,
        opts?.equippedWearables,
        opts?.traits,
        opts?.sourceTokenId,
        opts?.hauntId,
      );
      GlobalState.CHAT.dispatch({
        type: 'PUSH_GOTCHI_SIDES',
        gotchiSides: { [cacheKey]: svgs, [id]: svgs },
      });
      return svgs;
    }
  }

  // gotchi is Nakey or has wrong id number return defaultGotchi.
  if (isNaN(Number(id)) || id.includes('0x')) return defaultGotchi;
  // Try ChatContext first we're storing the unmutated svgs there.
  if (GlobalState.CHAT.state.gotchiSides[id]) {
    // console.log(`@fetchAavegotchiSideSVGs: Found stored svgs for ${id}:`, GlobalState.CHAT.state.gotchiSides[id]);
    return GlobalState.CHAT.state.gotchiSides[id];
  } else {
    // console.log(`@fetchAavegotchiSideSVGs: Gotchi ${id} svgs not stored, fetching... `);
    const subgraphQuery = getAavegotchiSideSVGs(id);
    let svgs;
    try {
      const res = await useSubgraph<{ aavegotchis: Array<{ svg: string; back: string; right: string; left: string }> }>(
        subgraphQuery,
        aavegotchiSvgSubgraph,
      );
      const sideviews = res?.aavegotchis?.[0];
      if (!sideviews?.svg) {
        throw new Error(`No SVG sides for gotchi ${id} on ${aavegotchiSvgSubgraph}`);
      }
      svgs = [sideviews.svg, sideviews.left, sideviews.right, sideviews.back];
    } catch (error) {
      console.warn(`@fetchAavegotchiSideSVGs:Failed to fetch gotchi ${id} sides from subgraph.`, error);
      svgs = await fetchContractAavegotchiSides(id);
    }

    const gotchiSides = {};
    gotchiSides[id] = svgs;

    GlobalState.CHAT.dispatch({
      type: 'PUSH_GOTCHI_SIDES',
      gotchiSides,
    });
    // console.log(`@fetchAavegotchiSideSVGs:SVGS for ${id}`, svgs);
    return svgs;
  }
};

export function sortAavegotchis(gotchis: AavegotchiObject[]): AavegotchiObject[] {
  const sortedGotchis = gotchis.sort(function (a: AavegotchiObject, b: AavegotchiObject) {
    return Number(b.modifiedRarityScore) - Number(a.modifiedRarityScore);
  });
  // console.og("sorted:", sortedGotchis);

  return sortedGotchis;
}

export async function fetchAavegotchiSvg(id: string, currentNetwork: NetworkNames, provider: ethers.providers.Provider): Promise<string> {
  try {
    const query = getAavegotchiSvg(id);
    const { aavegotchis } = await useSubgraph<{ aavegotchis: Array<{ svg: string }> }>(query, aavegotchiSvgSubgraph);
    return aavegotchis[0].svg;
  } catch (e) {
    console.warn(`Failed to fetch gotchi ${id} svg from subgraph:ERR`, e);
    const vars = varsForNetwork(currentNetwork);
    const AavegotchiContract = new ethers.Contract(vars.aavegotchiDiamond, SvgFacet.abi, provider);
    const svg = await AavegotchiContract.getAavegotchiSvg(id);
    return svg;
  }
}

export function getGotchiData(
  gotchi: AavegotchiObject | Aavegotchi | GotchiverseAavegotchi,
  currentNetwork: NetworkNames,
  currentAccount: string,
  isDemoMode: boolean,
): SelectedPlayer {
  const { isSpectator, name, collateral, equippedWearables } = gotchi;
  const cartridgeHero = gotchi as GotchiverseAavegotchi;
  const isCartridgeHero = Boolean(cartridgeHero.isCartridgeHero);
  const cartridgeCollateral =
    cartridgeHero.cartridgeCollateral ||
    (isCartridgeHero ? parseCartridgeHeroCollateral(String(cartridgeHero.id || '')) : undefined) ||
    undefined;
  const cartridgeSourceTokenId = cartridgeHero.cartridgeSourceTokenId || undefined;
  const hauntId =
    cartridgeHero.hauntId === 1 || cartridgeHero.hauntId === 2
      ? cartridgeHero.hauntId
      : (() => {
          if (!isCartridgeHero) return undefined;
          const name = String(
            collateralFromSimId(cartridgeCollateral)?.name || cartridgeCollateral || '',
          )
            .trim()
            .toLowerCase();
          if (
            name === 'amwbtc' ||
            name === 'amwmatic' ||
            name.startsWith('am') ||
            name === 'wbtc' ||
            name === 'matic'
          ) {
            return 2;
          }
          return undefined;
        })();

  let collateralColor;
  let rightHand;
  let leftHand;

  if (!isSpectator) {
    if (isCartridgeHero) {
      const coll = collateralFromSimId(cartridgeCollateral);
      collateralColor = coll?.primaryColor || '#64438E';
      rightHand = getHandWearables(equippedWearables?.[5] || 0);
      leftHand = getHandWearables(equippedWearables?.[4] || 0);
    } else {
      collateralColor = collateralByAddress(currentNetwork, collateral).primaryColor;
      rightHand = getHandWearables(equippedWearables[5]);
      leftHand = getHandWearables(equippedWearables[4]);
    }
  }

  const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') || '' : '';

  const rawTraits =
    (gotchi as GotchiverseAavegotchi).withSetsNumericTraits ||
    (gotchi as GotchiverseAavegotchi).numericTraits;
  const withSetsNumericTraits: SelectedPlayer['withSetsNumericTraits'] =
    Array.isArray(rawTraits) && rawTraits.length >= 4
      ? [
          traitNumber(rawTraits[0], 50),
          traitNumber(rawTraits[1], 50),
          traitNumber(rawTraits[2], 50),
          traitNumber(rawTraits[3], 50),
          traitNumber(rawTraits[4], 50),
          traitNumber(rawTraits[5], 50),
        ]
      : isCartridgeHero || Boolean(gotchi.isSpectator)
        ? [50, 50, 50, 50, 50, 50]
        : undefined;

  return {
    authToken,
    isSpectator: gotchi.isSpectator,
    id: 'tokenId' in gotchi ? gotchi.tokenId.toString() : gotchi.id,
    name,
    level: Number(gotchi.level),
    // if running in demo mode with demo gotchis we have gotchi.owner address as an 0x000.. address and pass logged in owner
    // merged into it to pass the the server to validate admin whitelist during demo mode
    owner: isDemoMode ? `${String(gotchi.owner)}:${currentAccount}` : currentAccount,
    network: currentNetwork,
    collateralColor,
    rightHand,
    leftHand,
    isCartridgeHero: isCartridgeHero || undefined,
    cartridgeCollateral,
    cartridgeSourceTokenId,
    hauntId,
    equippedWearables: isCartridgeHero
      ? ((Array.isArray(equippedWearables) ? equippedWearables : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) as number[])
      : undefined,
    withSetsNumericTraits,
  };
}

export async function getGotchiRealmData(gotchiId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/realm/gotchi/status`, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gotchi: gotchiId }),
      method: 'POST',
    });
    return response.status === 200 && (await response.json());
  } catch (err) {
    return null;
  }
}

export async function getGotchiCombatTraits(account: string, map: 'citaadel' | 'aarena' = 'citaadel') {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/combat-traits?owner=${account}&map=${map}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'GET',
    });
    return response.status === 200 && (await response.json());
  } catch (err) {
    return null;
  }
}

/**
 * Client combat preview aligned with realm-server combatStats.ts / GAME_CONFIG
 * (Bible Ch.2 trait mappings; traits-only — no wearables).
 */
export function computeClientCombatTraits(
  gotchi: Aavegotchi | GotchiverseAavegotchi | { withSetsNumericTraits?: number[]; withSetsRarityScore?: string | number },
) {
  const traits = gotchi.withSetsNumericTraits || [50, 50, 50, 50, 50, 50];
  const nrg = Number(traits[0]);
  const agg = Number(traits[1]);
  const spk = Number(traits[2]);
  const brn = Number(traits[3]);
  const NRG = Number.isFinite(nrg) ? Math.min(99, Math.max(0, Math.round(nrg))) : 50;
  const AGG = Number.isFinite(agg) ? Math.min(99, Math.max(0, Math.round(agg))) : 50;
  const SPK = Number.isFinite(spk) ? Math.min(99, Math.max(0, Math.round(spk))) : 50;
  const BRN = Number.isFinite(brn) ? Math.min(99, Math.max(0, Math.round(brn))) : 50;
  const brs = Number(gotchi.withSetsRarityScore) || 0;

  // Match shared.utils.api getPlayerMaxHealth / getPlayerMaxAP
  let maxHealth = 1000;
  if (NRG < 50) maxHealth += 10 * (50 - NRG);
  maxHealth = Math.min(2500, maxHealth);

  let maxAP = 100;
  if (NRG > 50) maxAP += 1 * (NRG - 49);
  maxAP = Math.min(500, maxAP);

  // Defense: AGG < 50; Melee: BRN < 50; Ranged: BRN > 50 (same as server)
  let defense = 0;
  if (AGG < 50) defense += 50 - AGG;

  let meleePower = 0;
  if (BRN < 50) meleePower = Math.round(1.5 * (50 - BRN));

  let rangedPower = 0;
  if (BRN > 50) rangedPower = 1 * (BRN - 49);

  const evasion = 0; // baseEvasion; SPK≥50 raises luck for evade rolls
  let luck = 1;
  if (SPK >= 50) luck = Number((1 + 0.005 * (SPK - 50)).toFixed(3));

  let attackSpeed = 1;
  if (AGG > 50) attackSpeed += 0.01 * (AGG - 49);
  attackSpeed = Math.min(2, attackSpeed);

  let healthRegenAmount = 7.5;
  let apRegenAmount = 3;
  if (SPK < 50) {
    const regenMult = 1 + 0.02 * (50 - SPK);
    healthRegenAmount *= regenMult;
    apRegenAmount *= regenMult;
  }

  const alchemicaCarryingCapacity = Math.max(250, Math.ceil(100 * Math.pow(Math.max(brs, 300) / 300, 2)));

  const calculatedDefense = defense * 0.005;
  const damageReduction = Number(Math.min(1, calculatedDefense / (1 + calculatedDefense)).toFixed(3));

  return {
    maxHealth,
    maxAP,
    healthRegenAmount: Number(healthRegenAmount.toFixed(2)),
    apRegenAmount: Number(apRegenAmount.toFixed(2)),
    alchemicaCarryingCapacity,
    evasion,
    meleePower,
    rangedPower,
    defense,
    damageReduction,
    attackSpeed: Number(attackSpeed.toFixed(2)),
    luck,
    wearableTraitBonuses: {},
  };
}

export function setAavegtochiToLocalStorage(gotchiData: SelectedPlayer, backgroundColor, isAavegotchiLent, ownedParcels) {
  localStorage.removeItem('selectedPlayer');
  localStorage.setItem('selectedPlayer', JSON.stringify(gotchiData));
  localStorage.removeItem('gotchiExtras');
  localStorage.setItem('gotchiExtras', JSON.stringify({ backgroundColor, isAavegotchiLent, ownedParcels }));
}

export function getHandWearables(wearableId: number): HandWearable {
  // SVG ids for linkCube, fireball, stick and axe.
  const fireWearables = [17, 58, 130, 82];
  const meleeWearables = [106, 107, 64, 65];
  let attack;

  fireWearables.forEach((wearable) => {
    if (wearable === wearableId) {
      attack = {
        id: wearableId,
        type: 'fire',
      };
    }
  });

  meleeWearables.forEach((wearable) => {
    if (wearable === wearableId) {
      attack = {
        id: wearableId,
        type: 'melee',
      };
    }
  });
  if (attack) {
    const itemType = Items.filter(({ svgId }) => Number(svgId) === wearableId)[0];
    if (itemType) {
      attack.rarity = maxQuantityToRarity(itemType.maxQuantity);
      attack.dimensions = itemType.dimensions;
    }
    // console.log('attack', attack);
  }
  return attack;
}

export async function fetchItemTypes(itemIDs: string[], currentNetwork, globalProvider) {
  const vars = varsForNetwork(currentNetwork);
  const itemsContract = new ethers.Contract(vars.aavegotchiDiamond, ItemsFacet.abi, globalProvider);
  const items: ItemObject[] = await itemsContract.getItemTypes(itemIDs);
  return items;
}

export function extractParts(svg, targetClass, resetPosition, width, height): string {
  const doc = document.createDocumentFragment();
  const wrapper = document.createElement('svg');
  wrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  wrapper.setAttribute('viewbox', `0 0 ${width} ${height}`);
  wrapper.setAttribute('width', width);
  wrapper.setAttribute('height', height);
  wrapper.innerHTML = svg;
  doc.appendChild(wrapper);

  const textnodes = doc.querySelectorAll(targetClass);

  if (textnodes.length) {
    wrapper.innerHTML = resetPosition ? textnodes[0].childNodes[0].childNodes[0].innerHTML : textnodes[0].childNodes[0].innerHTML;
  }

  const div = document.createElement('svg');
  div.appendChild(doc);
  // console.log("svg => ", div.innerHTML);

  const blob = new Blob([div.innerHTML], { type: 'image/svg+xml' });
  // console.log("partURl", URL.createObjectURL(blob));

  return URL.createObjectURL(blob);
}

export function deleteParts(svg, targetClass) {
  const wrapper = document.createElement('svg');

  wrapper.innerHTML = svg;

  const textnodes = wrapper.querySelectorAll(targetClass);
  textnodes[0].remove();

  return wrapper.innerHTML;
}

export function _aavegotchiSpriteSVG(svgs, col: number): string {
  /**
   * Create a spritesheet from the SVG data of each frames
   * svgs: array of svgs, one per frame
   * col: number of columns of the resulting spritesheet
   * Returns blob format
   */

  const doc = document.createDocumentFragment();
  const wrapper = document.createElement('svg');
  let currentCol = 0;
  let currentRow = 0;
  let x, y;
  const height = Math.ceil(svgs.length / col) * 64;

  wrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  wrapper.setAttribute('viewbox', `0 0 ${64 * col} ${height}`);
  wrapper.setAttribute('width', `${64 * col}`);
  wrapper.setAttribute('height', height.toString());

  svgs.forEach((svg) => {
    x = currentCol * 64;
    y = currentRow * 64;

    if (currentCol < col - 1) currentCol++;
    else {
      currentCol = 0;
      currentRow++;
    }

    const svgFrame = document.createElement('svg');
    svgFrame.innerHTML = svg;

    // @ts-expect-error
    svgFrame.innerHTML = svgFrame.childNodes[0].innerHTML;

    svgFrame.setAttribute('x', x.toString());
    svgFrame.setAttribute('y', y.toString());
    wrapper.appendChild(svgFrame);
  });
  // wrapper.innerHTML = svgs;
  doc.appendChild(wrapper);

  const div = document.createElement('svg');
  div.appendChild(doc);

  // console.log("sprite", div.innerHTML);
  const blob = new Blob([div.innerHTML], { type: 'image/svg+xml' });
  // console.log("partURl", URL.createObjectURL(blob));

  return URL.createObjectURL(blob);
}

/* this mutate the aavegotchi SVG to get the final desired result.
   what we need for the game is the aavegotchi without backround and shadow.
  returns final svg and blobl url.
*/
export function _getMutateSVGBloblAavegotchiSVG(
  svg,
  options: {
    handsRaised?: boolean;
    kinshipEyes?: boolean;
    removeShadow?: boolean;
    removeBackground?: boolean;
    animate?: boolean;
    mouthOverride?: boolean;

    stripRightHand?: boolean;
    stripLeftHand?: boolean;
  },
) {
  if (!svg) return;

  let finalSVG;
  const { handsRaised, kinshipEyes, removeBackground, animate, mouthOverride, stripRightHand, stripLeftHand, removeShadow } = options;
  let styles = '';

  if (removeShadow) {
    styles = styles.concat(removeShadowCSS);
  }

  if (removeBackground) {
    styles = styles.concat(removeBackgroundCSS);
  }

  if (stripRightHand) {
    styles = styles.concat(removeRightHandWearables);
  }

  if (stripLeftHand) {
    styles = styles.concat(removeLeftHandWearables);
  }

  if (animate) {
    styles = styles.concat(basicUpDown(handsRaised));
  }

  if (handsRaised) {
    finalSVG = addStyles(svg, styles.concat(raiseHands));
  } else {
    finalSVG = addStyles(svg, styles);
  }

  if (kinshipEyes) {
    finalSVG = replaceParts(finalSVG, 'g.gotchi-eyeColor', kinshipEyes);
  }

  if (mouthOverride) {
    finalSVG = replaceParts(finalSVG, 'g.gotchi-primary-mouth', neutralMouth);
  }
  const blob = new Blob([finalSVG], { type: 'image/svg+xml' });

  return {
    url: URL.createObjectURL(blob),
    svg: finalSVG,
  };
}

export const createSvgBlob = (svg): string => {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
};

/**
 * Fetches alchemica balance via api
 * @param {string} userAddress - Address of target wallet
 * @param {NetworkNames} network - Network to fetch alchemica balance from
 * @param {React.Dispatch<Action>} notificationDispatch - Dispatch function to handle toast notifications on error
 * @returns {Tuple<number, 4>} - Returns alchemica balance in the following order [FUD,FOMO,ALPHA,KEK]
 */
export const getUserAlchemicaBalances = async (
  userAddress: string,
  network: NetworkNames,
  provider: ethers.providers.Provider,
  notificationDispatch?: React.Dispatch<Action>,
): Promise<number[]> => {
  try {
    const response = await getAlchemicaBalances(userAddress, provider, network);
    return response;
  } catch (err) {
    if (notificationDispatch) {
      showNotificationWithTimeout(notificationDispatch, {
        type: 'error',
        title: 'Failed fetching balances',
        message: err.message,
        options: { sound: true },
      });
    } else {
      console.error(err);
    }
  }
};
/*
 * Fetches alchemica transaction history via alchemica api
 * @param {string} userAddress - Address of target wallet
 * @param {NetworkNames} network - Network to fetch alchemica balance from
 * @param {React.Dispatch<Action>} notificationDispatch - Dispatch function to handle toast notifications on error
 * @returns {TransactionHistoryItem[]} Transaction History Array.
 */

export const getUserAlchemTransactionHistory = async (
  userAddress: string,
  network: NetworkNames,
  notificationDispatch?: React.Dispatch<Action>,
): Promise<TransactionHistory[] | undefined> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alchemica/status?address=${userAddress}`);
    const data = await response.json();
    if (data.error) {
      throwError(data, { dispatch: notificationDispatch, title: 'Failed fetching transaction history' });
      return undefined;
    } else {
      return data.data;
    }
  } catch (err) {
    throwError(err, { dispatch: notificationDispatch, title: 'Failed fetching transaction history' });
  }
};

export const getUserTransactionHistory = async (
  userAddress: string,
  network: NetworkNames,
  notificationDispatch?: React.Dispatch<Action>,
): Promise<{ deposits: TransactionHistory[]; withdraws: TransactionHistory[] }> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transaction/status?address=${userAddress}`);
    const data = await response.json();
    if (data.error) {
      throwError(data, { dispatch: notificationDispatch, title: 'Failed fetching transaction history' });
      return undefined;
    } else {
      return data;
    }
  } catch (err) {
    throwError(err, { dispatch: notificationDispatch, title: 'Failed fetching transaction history' });
  }
};

export const getGlobalTransactionStatus = async (notificationDispatch?: React.Dispatch<Action>): Promise<number | undefined> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transaction/status?status=ALL`);
    const data = await response.json();
    if (data.error) {
      throwError(data, { dispatch: notificationDispatch, title: 'Failed fetching transaction history' });
      return undefined;
    } else {
      return data.data.pendingUserClaims;
    }
  } catch (err) {
    throwError(err, { dispatch: notificationDispatch, title: 'Failed fetching transaction history' });
  }
};

const throwError = (err: Error, notification?: { dispatch: React.Dispatch<Action>; title: string }) => {
  if (notification) {
    showNotificationWithTimeout(notification.dispatch, {
      type: 'error',
      title: notification.title,
      message: err.message,
      options: { sound: true },
    });
  } else {
    console.error(err);
  }
};

export const brsToRarity = (score: number) => {
  switch (true) {
    case score < 450:
      return 'common';
    case score <= 525:
      return 'uncommon';
    case score <= 580:
      return 'rare';
    default:
      return 'legendary';
  }
};

export const getKinshipLevel = (kinship: number) => {
  switch (true) {
    case kinship <= 10:
      return 'Scorned';
    case kinship <= 25:
      return 'Resentful';
    case kinship <= 40:
      return 'Angry';
    case kinship <= 50:
      return 'Neutral';
    case kinship <= 75:
      return 'Frenly';
    case kinship <= 90:
      return 'Chummy';
    case kinship <= 100:
      return 'Cozy';
    case kinship <= 500:
      return 'Devoted';
    case kinship > 500:
      return 'Inseparable';
  }
};

export const renderTraitValue = (base: number, withSet: number) => {
  if (base === withSet) return `${base}`;
  return `${withSet} (${base})`;
};

export const calculatePercentage = (level: number, experience: number) => {
  const xpRequired = Math.pow(level, 2) / 0.02;
  if (experience >= xpRequired) return 100;
  return (experience * 100) / xpRequired;
};

export const getRarityType = (score: number) => {
  switch (true) {
    case score <= 1 || score >= 98:
      return 'mythical';
    case score <= 9 || score >= 91:
      return 'rare';
    case score <= 24 || score >= 75:
      return 'uncommon';
    default:
      return 'common';
  }
};

export const getGotchiTraitByIndex = (index: number) => {
  switch (index) {
    case 0:
      return '⚡️ Energy';
    case 1:
      return '👹 Aggression';
    case 2:
      return '👻 Spookiness';
    case 3:
      return '🧠 Brain Size';
    case 4:
      return '👀 Eye Shape';
    case 5:
      return '👁 Eye color';
  }
};

export const getGotchiTraitObjectByIndex = (index: number) => {
  switch (index) {
    case 0:
      return {
        value: 'Energy',
        icon: '⚡️',
      };
    case 1:
      return {
        value: 'Aggression',
        icon: '👹',
      };
    case 2:
      return {
        value: 'Spookiness',
        icon: '👻',
      };
    case 3:
      return {
        value: 'Brain Size',
        icon: '🧠',
      };
    case 4:
      return {
        value: 'Eye Shape',
        icon: '👀',
      };
    case 5:
      return {
        value: 'Eye color',
        icon: '👁',
      };
  }
};

export const renderSpiritForce = (amount: string, collateral: string) => {
  if (!collateral) {
    return '';
  }
  const name = Object.keys(collateralObjects).find((key) => {
    const addresses = collateralObjects[key];

    // CHANGED - To allow for Matic gotchis on test networks
    // return addresses[currentNetwork || 'matic'].toLowerCase() === collateral.toLowerCase();
    return addresses.matic.toLowerCase() === collateral.toLowerCase();
  });
  const collateralObject: CollateralObject = collateralObjects[name];
  const decimals = collateralObject.decimals;
  return `${Number(formatUnits(amount, decimals)).toFixed(4)} ${name}`;
};

export const formatTimeLeft = (seconds: number) => {
  if (seconds === 0) return 'Ready';

  const secondsPerHour = 3600;
  const hours = Math.floor(seconds / secondsPerHour);

  const secondsPerMinute = 60;
  const minutes = Math.floor((seconds % secondsPerHour) / secondsPerMinute);

  return `${formatDigit(hours)}h ${formatDigit(minutes)}m`;
};
