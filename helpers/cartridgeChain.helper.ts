import { constants, Contract, providers, utils, type Signer } from 'ethers';
import { coreURI, varsForNetwork } from 'shared_code/web3/shared.const.web3';
import { useSubgraph } from 'web3/subgraph';
import type { CartridgeHero } from './cartridgeHero.helper';
import { collateralNameForWalletGotchi } from './cartridgeHero.helper';
import { normalizeCWearables, type CWearable } from './cartridgeWearable.helper';

/**
 * Aarcade cartridges on Base mainnet (console + cartridge diamonds), replacing cartridge-sim
 * for Base. Addresses match AarcadeGh-t config/cartridgeChain.base.json.
 */
export const BASE_CARTRIDGE_CHAIN = {
  chainId: 8453,
  consoleDiamond: '0x6e33EEEE247b0278D9CB7c83C1890d47fd1781c2',
  cartridgeDiamond: '0xBDb53a900884B1538Ad097Bd880D8509810BDebF',
};

const CONSOLE_ABI = [
  'function mintOwnCartridge(bytes32 gameId) returns (uint256)',
  'function playerCartridge(bytes32 gameId, address player) view returns (uint256)',
];

const CARTRIDGE_ABI = [
  'function bindOwned(uint256 cartridgeId, uint256 sourceTokenId)',
  'function bindStarter(uint256 cartridgeId, bytes32 templateId, address collateral) payable',
  'function bindRental(uint256 cartridgeId, uint256 sourceTokenId, address collateral) payable',
  'function starterBindFeeGhst() view returns (uint256)',
  'function rentalBindFeeGhst() view returns (uint256)',
  'function heroIds(uint256 cartridgeId) view returns (bytes32[])',
  'function getActiveHeroId(uint256 cartridgeId) view returns (bytes32)',
  'function getHero(uint256 cartridgeId, bytes32 heroId) view returns (tuple(bytes32 id, uint256 sourceTokenId, uint8 bindType, int16[6] numericTraits, int16[6] modifiedTraits, uint16[16] equippedWearables, uint256 level, uint256 kinship, uint256 experience, bytes32 svgIsoHash, bytes32 svgTopdownHash, bytes32 svgSidescrollHash, string svgBundleUri))',
  'function wearableIds(uint256 cartridgeId) view returns (bytes32[])',
  'function getWearable(uint256 cartridgeId, bytes32 cWearableId) view returns (tuple(bytes32 id, uint256 itemTypeId, uint8 slotIndex, uint16 durabilityCurrent, uint16 durabilityMax, bool waived, bool equipped, bytes32 refId))',
];

/** IAarcadeCartridge.BindType: None, Owned, Rented, Starter. */
const BIND_TYPES = ['none', 'owned', 'rental', 'starter'];

/** Base gameIds whose cartridges live on mainnet (RH/BTC stay on cartridge-sim). */
export const isMainnetCartridgeGame = (gameId: string): boolean => String(gameId).toLowerCase() === 'gotchiverse-base';

const gameIdBytes32 = (gameId: string): string => utils.keccak256(utils.toUtf8Bytes(String(gameId).toLowerCase()));

/** View calls always go to Base, whatever chain the wallet is on. */
const baseReader = (): providers.JsonRpcProvider => new providers.JsonRpcProvider(varsForNetwork('base').jsonRPC);

const readConsole = () => new Contract(BASE_CARTRIDGE_CHAIN.consoleDiamond, CONSOLE_ABI, baseReader());
const readCartridge = () => new Contract(BASE_CARTRIDGE_CHAIN.cartridgeDiamond, CARTRIDGE_ABI, baseReader());

async function baseSigner(signer: Signer | undefined): Promise<Signer> {
  if (!signer) throw new Error('Connect a wallet to continue');
  const chainId = await signer.getChainId();
  if (chainId !== BASE_CARTRIDGE_CHAIN.chainId) throw new Error('Switch your wallet to Base to continue');
  return signer;
}

/** Wallet's mainnet cartridge id for this game, or null when it has none. */
export async function readPlayerCartridgeId(wallet: string, gameId: string): Promise<string | null> {
  const id = await readConsole().playerCartridge(gameIdBytes32(gameId), wallet);
  return id && !id.isZero() ? id.toString() : null;
}

/** Owned/rented heroes carry their source gotchi's collateral; look it up on the core subgraph. */
async function collateralsForTokenIds(tokenIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!tokenIds.length) return out;
  try {
    const ids = tokenIds.map((id) => `"${id}"`).join(',');
    const res = await useSubgraph<{ aavegotchis: Array<{ id: string; collateral: string }> }>(
      `{ aavegotchis(first: ${tokenIds.length}, where: { id_in: [${ids}] }) { id collateral } }`,
      coreURI,
    );
    for (const g of res?.aavegotchis || []) {
      out.set(String(g.id), collateralNameForWalletGotchi('base', g.collateral).toLowerCase());
    }
  } catch (err) {
    console.warn('@collateralsForTokenIds: collateral lookup failed', err);
  }
  return out;
}

export async function readCartridgeHeroes(
  cartridgeId: string,
): Promise<{ heroes: CartridgeHero[]; activeHeroId: string | null }> {
  const cartridge = readCartridge();
  const [ids, activeRaw] = await Promise.all([cartridge.heroIds(cartridgeId), cartridge.getActiveHeroId(cartridgeId)]);
  const rows = await Promise.all((ids as string[]).map((heroId) => cartridge.getHero(cartridgeId, heroId)));
  const sourceIds = rows.map((h) => h.sourceTokenId.toString()).filter((id) => id !== '0');
  const collaterals = await collateralsForTokenIds(Array.from(new Set(sourceIds)));

  const heroes = rows.map((h): CartridgeHero => {
    const sourceTokenId = h.sourceTokenId.toString();
    return {
      id: h.id,
      bindType: BIND_TYPES[Number(h.bindType)] || undefined,
      // Starter binds don't store collateral onchain.
      collateral: collaterals.get(sourceTokenId) || 'dai',
      sourceTokenId,
      traits: (h.modifiedTraits as number[]).map(Number),
      equippedWearables: (h.equippedWearables as number[]).map(Number),
      level: Number(h.level.toString()) || 1,
      kinship: Number(h.kinship.toString()) || 0,
      experience: Number(h.experience.toString()) || 0,
    };
  });
  const activeHeroId = activeRaw && !/^0x0+$/.test(activeRaw) ? String(activeRaw) : null;
  return { heroes, activeHeroId };
}

export async function readCartridgeWearables(cartridgeId: string): Promise<CWearable[]> {
  const cartridge = readCartridge();
  const ids = (await cartridge.wearableIds(cartridgeId)) as string[];
  const rows = await Promise.all(ids.map((id) => cartridge.getWearable(cartridgeId, id)));
  return normalizeCWearables(
    rows.map((w) => ({
      id: w.id,
      itemTypeId: Number(w.itemTypeId.toString()),
      slotIndex: Number(w.slotIndex),
      equippedTo: w.equipped ? 'equipped' : null,
      refId: w.refId,
      source: 'mainnet',
    })),
  );
}

/** Free self-mint: one cartridge per wallet per game. Returns the existing one when already minted. */
export async function mintOwnCartridge(signer: Signer | undefined, wallet: string, gameId: string): Promise<string> {
  const existing = await readPlayerCartridgeId(wallet, gameId);
  if (existing) return existing;
  const console = new Contract(BASE_CARTRIDGE_CHAIN.consoleDiamond, CONSOLE_ABI, await baseSigner(signer));
  const tx = await console.mintOwnCartridge(gameIdBytes32(gameId));
  await tx.wait();
  const id = await readPlayerCartridgeId(wallet, gameId);
  if (!id) throw new Error('Cartridge mint did not confirm');
  return id;
}

/** Revert reason from an ethers v5 call error, if the contract gave one. */
const revertReason = (err: unknown): string => {
  const e = err as { reason?: string; error?: { message?: string }; message?: string };
  return String(e?.reason || e?.error?.message || e?.message || '');
};

/**
 * Bind a wallet-owned gotchi as a cAavegotchi (no fee on mainnet). Simulated first so a revert
 * surfaces its Cartridge reason (e.g. already bound) instead of a wallet gas-estimation error.
 */
export async function bindOwnedGotchi(signer: Signer | undefined, cartridgeId: string, sourceTokenId: string): Promise<void> {
  const cartridge = new Contract(BASE_CARTRIDGE_CHAIN.cartridgeDiamond, CARTRIDGE_ABI, await baseSigner(signer));
  try {
    await cartridge.callStatic.bindOwned(cartridgeId, sourceTokenId);
  } catch (err) {
    const reason = revertReason(err);
    if (/Cartridge: /.test(reason)) throw new Error(reason.match(/Cartridge: [^"']*/)?.[0] || reason);
    throw new Error(reason || 'This gotchi could not be bound to your cartridge.');
  }
  const tx = await cartridge.bindOwned(cartridgeId, sourceTokenId);
  await tx.wait();
}

/**
 * Starter/rental binds charge a GHST fee set by the protocol multisig (0 today). Refuse
 * rather than send when a fee is set, since that needs a GHST approval this flow lacks.
 * The collateral argument only routes that fee, so it is zero while binds are free.
 */
async function assertFreeBind(kind: 'starter' | 'rental'): Promise<void> {
  const cartridge = readCartridge();
  const fee = kind === 'starter' ? await cartridge.starterBindFeeGhst() : await cartridge.rentalBindFeeGhst();
  if (!fee.isZero()) throw new Error(`The ${kind} bind now has a GHST fee; it isn't supported here yet`);
}

export async function bindStarterHero(
  signer: Signer | undefined,
  cartridgeId: string,
  collateralName: string,
): Promise<void> {
  await assertFreeBind('starter');
  const cartridge = new Contract(BASE_CARTRIDGE_CHAIN.cartridgeDiamond, CARTRIDGE_ABI, await baseSigner(signer));
  const templateId = utils.keccak256(utils.toUtf8Bytes(`starter-${collateralName.toLowerCase()}`));
  const tx = await cartridge.bindStarter(cartridgeId, templateId, constants.AddressZero);
  await tx.wait();
}

export async function bindRentalGotchi(
  signer: Signer | undefined,
  cartridgeId: string,
  sourceTokenId: string,
): Promise<void> {
  await assertFreeBind('rental');
  const cartridge = new Contract(BASE_CARTRIDGE_CHAIN.cartridgeDiamond, CARTRIDGE_ABI, await baseSigner(signer));
  try {
    await cartridge.callStatic.bindRental(cartridgeId, sourceTokenId, constants.AddressZero);
  } catch (err) {
    const reason = revertReason(err);
    throw new Error(/Cartridge: !rental/.test(reason) ? 'This gotchi is not lent to you.' : reason || 'This gotchi could not be bound to your cartridge.');
  }
  const tx = await cartridge.bindRental(cartridgeId, sourceTokenId, constants.AddressZero);
  await tx.wait();
}
