/**
 * FE bridge to the Gotchiverse-2D diamond (Base Sepolia) for:
 * - soft cTiles 8–47 → `mintTiles`
 * - soft installs 162–215 → `craftInstallations` (GvCraftFacet)
 * - soft installs 162–215 → `placeSoftInstall` / `unequipSoftInstall` (GvPlaceFacet)
 *
 * When NEXT_PUBLIC_USE_GV2D_DIAMOND=true, Crafting Table soft recipes and Phaser
 * soft place/unequip call the diamond instead of local-only helpers. Golden tiles
 * 1–3 and L1 Installation diamond crafts stay on their existing paths.
 *
 * Deployed diamond: packages/gv2d-diamond/deployments/base-sepolia.json
 * paymentEnabled=false on Sepolia — no alchemica approve for mint/craft; place
 * burns bag balance (payment flag irrelevant). Soft-install bag SoT = GV-2D
 * ERC1155 (ids 162–215). cPaarcel ownership remains cartridge / off-chain.
 */
import { ethers, Signer } from 'ethers';
import type { providers } from 'ethers';
import Gv2dDiamondAbi from 'web3/abi/Gv2dDiamond.json';
import { gasPriceDict } from 'web3/web3';
import GlobalState from 'contexts/GlobalState';
import { CTILE_ID_END, CTILE_ID_START, isCTileItemId, applyCTileInventoryBalance } from 'helpers/ctile.helper';
import { getTypeByItemId, getLocalInventoryItem } from 'helpers/installations.helper';
import { setOffchainInventoryQty } from 'helpers/offchain.store';
import {
  adjustFurnitureQty,
  getFurnitureQty,
  isStoreFurnitureItemId,
} from 'helpers/store.layout.helper';
import {
  adjustLodgeFurnitureQty,
  getLodgeFurnitureQty,
  isLodgeFurnitureItemId,
} from 'helpers/lodge.layout.helper';
import { isConsoleItemId } from 'helpers/console.installation.helper';
import type { Installation } from 'types';

/** Base Sepolia — GV-2D soft-tile / soft-install diamond host chain. */
export const GV2D_BASE_SEPOLIA_CHAIN_ID = 84532;
export const GV2D_BASE_SEPOLIA_CHAIN_ID_HEX = '0x14a34';

/** Default from packages/gv2d-diamond/deployments/base-sepolia.json */
export const GV2D_DIAMOND_DEFAULT = '0x34a851523A6f3351940d235373038b2A0A85e872';

/** Soft-install ERC1155 band on GV-2D (disjoint from tiles 8–47). */
export const GV2D_SOFT_INSTALL_ID_START = 162;
export const GV2D_SOFT_INSTALL_ID_END = 215;

export function isGv2dDiamondMintEnabled(): boolean {
  const flag = String(process.env.NEXT_PUBLIC_USE_GV2D_DIAMOND || '').toLowerCase();
  return flag === 'true' || flag === '1' || flag === 'yes';
}

export function getGv2dDiamondAddress(): string {
  const fromEnv = String(process.env.NEXT_PUBLIC_GV2D_DIAMOND_ADDRESS || '').trim();
  if (fromEnv && ethers.utils.isAddress(fromEnv)) return ethers.utils.getAddress(fromEnv);
  return GV2D_DIAMOND_DEFAULT;
}

export function isGv2dSoftTileMintId(itemId: number | string): boolean {
  const id = Number(itemId);
  return isCTileItemId(id) && id >= CTILE_ID_START && id <= CTILE_ID_END;
}

export function isGv2dSoftInstallCraftId(itemId: number | string): boolean {
  const id = Number(itemId);
  return (
    Number.isFinite(id) &&
    id >= GV2D_SOFT_INSTALL_ID_START &&
    id <= GV2D_SOFT_INSTALL_ID_END
  );
}

export function getGv2dDiamondContract(
  signerOrProvider: Signer | providers.Provider,
): ethers.Contract {
  return new ethers.Contract(getGv2dDiamondAddress(), Gv2dDiamondAbi as any, signerOrProvider);
}

async function readChainId(provider: providers.Provider): Promise<number> {
  const net = await provider.getNetwork();
  return Number(net.chainId);
}

/**
 * Ensure the wallet is on Base Sepolia (84532). Tries switch, then add chain.
 * Throws a user-facing Error if the user rejects or no EIP-1193 provider exists.
 */
export async function ensureBaseSepoliaForGv2d(
  provider: providers.Provider,
  purpose = 'use the GV-2D diamond',
): Promise<void> {
  const chainId = await readChainId(provider);
  if (chainId === GV2D_BASE_SEPOLIA_CHAIN_ID) return;

  const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : undefined;
  if (!ethereum?.request) {
    throw new Error(`Switch wallet to Base Sepolia (chain 84532) to ${purpose}.`);
  }

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: GV2D_BASE_SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (err: any) {
    const code = err?.code ?? err?.data?.originalError?.code;
    // 4902 = chain not added yet
    if (code === 4902 || String(err?.message || '').toLowerCase().includes('unrecognized chain')) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: GV2D_BASE_SEPOLIA_CHAIN_ID_HEX,
            chainName: 'Base Sepolia',
            nativeCurrency: { name: 'Ether', decimals: 18, symbol: 'ETH' },
            rpcUrls: [
              process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
            ],
            blockExplorerUrls: ['https://sepolia.basescan.org/'],
          },
        ],
      });
    } else if (code === 4001) {
      throw new Error(`Connect / switch to Base Sepolia to ${purpose}.`);
    } else {
      throw new Error(
        err?.message || `Switch wallet to Base Sepolia (chain 84532) to ${purpose}.`,
      );
    }
  }

  // Re-check after wallet prompt (provider may still be stale briefly).
  const after = await readChainId(provider);
  if (after !== GV2D_BASE_SEPOLIA_CHAIN_ID) {
    // Some wallets need a fresh network read via ethereum
    try {
      const hex = await ethereum.request({ method: 'eth_chainId' });
      if (Number.parseInt(String(hex), 16) === GV2D_BASE_SEPOLIA_CHAIN_ID) return;
    } catch {
      /* ignore */
    }
    throw new Error('Wallet is not on Base Sepolia. Switch network and try Craft again.');
  }
}

export async function fetchGv2dItemBalance(
  account: string,
  itemId: number,
  provider: providers.Provider,
): Promise<number> {
  const contract = getGv2dDiamondContract(provider);
  const bal = await contract.balanceOf(account, itemId);
  return Number(bal.toString());
}

/** @deprecated Prefer fetchGv2dItemBalance — same ERC1155 balanceOf. */
export async function fetchGv2dTileBalance(
  account: string,
  itemId: number,
  provider: providers.Provider,
): Promise<number> {
  return fetchGv2dItemBalance(account, itemId, provider);
}

function ensureSoftInstallInventorySlot(itemId: number): Installation | undefined {
  const inventory = GlobalState.USER?.state?.inventory;
  if (!inventory) return;
  let item = getLocalInventoryItem(itemId, 'INSTALLATION') as Installation | undefined;
  if (item) return item;
  const typeData = getTypeByItemId(itemId, 0);
  item = {
    id: itemId,
    itemId,
    name: String(typeData?.name || `Soft install ${itemId}`),
    quantity: 0,
    type: 'INSTALLATION',
    width: (typeData?.width as any) || 1,
    height: (typeData?.height as any) || 1,
    level: typeData?.level || 1,
    itemType: Number(typeData?.installationType) || 0,
    alchemicaType: typeData?.alchemicaType,
    isVisible: true,
  };
  inventory.push(item);
  return item;
}

/**
 * Apply an absolute ERC1155 balance (or +delta) into local / offchain inventory
 * for soft-install ids 162–215. Also mirrors furniture bag qty (non-Console).
 */
export function applySoftInstallInventoryBalance(
  itemId: number,
  absoluteQty?: number,
  deltaQty?: number,
): number {
  if (!isGv2dSoftInstallCraftId(itemId)) return 0;
  ensureSoftInstallInventorySlot(itemId);
  const item = getLocalInventoryItem(itemId, 'INSTALLATION') as Installation | undefined;
  let next: number;
  if (absoluteQty !== undefined && absoluteQty !== null && Number.isFinite(Number(absoluteQty))) {
    next = Math.max(0, Math.floor(Number(absoluteQty)));
  } else {
    const cur = Number(item?.quantity || 0);
    next = Math.max(0, cur + Math.floor(Number(deltaQty) || 0));
  }
  if (item) item.quantity = next;
  setOffchainInventoryQty(itemId, next);

  // Furniture place bags (Cashier / Terminal / shelf / Broadcaster) — skip Console instance bag.
  if (!isConsoleItemId(itemId)) {
    try {
      if (isStoreFurnitureItemId(itemId)) {
        const cur = getFurnitureQty(itemId);
        if (cur !== next) adjustFurnitureQty(itemId, next - cur);
      }
      if (isLodgeFurnitureItemId(itemId)) {
        const cur = getLodgeFurnitureQty(itemId);
        if (cur !== next) adjustLodgeFurnitureQty(itemId, next - cur);
      }
    } catch (e) {
      console.warn('[gv2d] furniture bag sync failed', itemId, e);
    }
  }

  return next;
}

/** Pull ERC1155 balanceOf into local / offchain inventory display slot. */
export async function syncCTileInventoryFromDiamond(
  account: string,
  itemId: number,
  provider: providers.Provider,
): Promise<number> {
  if (!isGv2dSoftTileMintId(itemId)) {
    throw new Error(`Not a soft cTile id: ${itemId}`);
  }
  const qty = await fetchGv2dItemBalance(account, itemId, provider);
  applyCTileInventoryBalance(itemId, qty);
  return qty;
}

export async function syncSoftInstallInventoryFromDiamond(
  account: string,
  itemId: number,
  provider: providers.Provider,
): Promise<number> {
  if (!isGv2dSoftInstallCraftId(itemId)) {
    throw new Error(`Not a soft-install id (162–215): ${itemId}`);
  }
  const qty = await fetchGv2dItemBalance(account, itemId, provider);
  applySoftInstallInventoryBalance(itemId, qty);
  return qty;
}

export type Gv2dMintResult = {
  ok: true;
  txHash: string;
  balance: number;
  message: string;
};

async function bindLiveSigner(
  signer: Signer,
  provider: providers.Provider,
  purpose: string,
): Promise<{ liveSigner: Signer; liveProvider: providers.Provider }> {
  await ensureBaseSepoliaForGv2d(provider, purpose);

  let liveSigner: Signer = signer;
  let liveProvider: providers.Provider = provider;
  const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : undefined;
  if (ethereum) {
    const { Web3Provider } = await import('@ethersproject/providers');
    liveProvider = new Web3Provider(ethereum);
    liveSigner = (liveProvider as any).getSigner();
    await ensureBaseSepoliaForGv2d(liveProvider, purpose);
  }
  return { liveSigner, liveProvider };
}

/**
 * Mint soft cTiles via diamond `mintTiles([id],[qty])`.
 * Requires wallet on Base Sepolia. Does not call craftCTileLocally.
 */
export async function mintSoftCTilesOnDiamond(opts: {
  itemId: number;
  quantity: number;
  account: string;
  signer: Signer;
  provider: providers.Provider;
  name?: string;
}): Promise<Gv2dMintResult> {
  const { itemId, account, signer, provider, name } = opts;
  const qty = Math.max(1, Math.floor(opts.quantity) || 1);

  if (!isGv2dSoftTileMintId(itemId)) {
    throw new Error(`Tile ${itemId} is not a soft cTile (8–47). Golden tiles use the Tile diamond.`);
  }
  if (!account) {
    throw new Error('Connect your wallet to mint soft cTiles on the GV-2D diamond.');
  }

  const { liveSigner, liveProvider } = await bindLiveSigner(
    signer,
    provider,
    'mint soft cTiles on the GV-2D diamond',
  );

  const contract = getGv2dDiamondContract(liveSigner);
  const tx = await contract.mintTiles([itemId], [qty], {
    ...(await gasPriceDict(liveSigner)),
  });
  const receipt = await tx.wait();
  if (receipt.status !== 1) {
    throw new Error('mintTiles transaction failed');
  }

  let balance = qty;
  try {
    balance = await syncCTileInventoryFromDiamond(account, itemId, liveProvider);
  } catch (e) {
    console.warn('[gv2d] balance sync after mint failed; applying local delta', e);
    applyCTileInventoryBalance(itemId, undefined, qty);
    balance = qty;
  }

  const label = name || `Tile ${itemId}`;
  return {
    ok: true,
    txHash: receipt.transactionHash as string,
    balance,
    message: `Minted ${qty}× ${label} on GV-2D diamond`,
  };
}

/**
 * Craft soft installs via diamond `craftInstallations([id],[qty])` (GvCraftFacet).
 * Requires wallet on Base Sepolia. Does not call craftStoreLocally / craftLodgeLocally / etc.
 * paymentEnabled=false — no alchemica approve.
 */
export async function craftSoftInstallsOnDiamond(opts: {
  itemId: number;
  quantity: number;
  account: string;
  signer: Signer;
  provider: providers.Provider;
  name?: string;
}): Promise<Gv2dMintResult> {
  const { itemId, account, signer, provider, name } = opts;
  const qty = Math.max(1, Math.floor(opts.quantity) || 1);

  if (!isGv2dSoftInstallCraftId(itemId)) {
    throw new Error(
      `Item ${itemId} is not a soft-install id (162–215). Golden/L1 Installation crafts use the live Installation diamond.`,
    );
  }
  if (!account) {
    throw new Error('Connect your wallet to craft soft installs on the GV-2D diamond.');
  }

  const { liveSigner, liveProvider } = await bindLiveSigner(
    signer,
    provider,
    'craft soft installs on the GV-2D diamond',
  );

  const contract = getGv2dDiamondContract(liveSigner);
  const tx = await contract.craftInstallations([itemId], [qty], {
    ...(await gasPriceDict(liveSigner)),
  });
  const receipt = await tx.wait();
  if (receipt.status !== 1) {
    throw new Error('craftInstallations transaction failed');
  }

  let balance = qty;
  try {
    balance = await syncSoftInstallInventoryFromDiamond(account, itemId, liveProvider);
  } catch (e) {
    console.warn('[gv2d] soft-install balance sync after craft failed; applying local delta', e);
    balance = applySoftInstallInventoryBalance(itemId, undefined, qty);
  }

  const label = name || `Install ${itemId}`;
  return {
    ok: true,
    txHash: receipt.transactionHash as string,
    balance,
    message: `Crafted ${qty}× ${label} on GV-2D diamond`,
  };
}

// ---------------------------------------------------------------------------
// Place / unequip (GvPlaceFacet) — soft installs 162–215
// ---------------------------------------------------------------------------

/**
 * Parcel key scheme for GvPlaceFacet:
 *
 * - Soft / cPaarcel / local numeric parcel id → `parcelKeyFromUint(id)`.
 *   Soft parcels in FE use `GotchiverseParcel.id` / `tokenId` (= realmTokenId mirror
 *   for cPaarcels, or another numeric local id). Prefer that uint as the place key.
 * - When only a Realm NFT id is available (non-soft owned parcel) →
 *   `parcelKeyFromRealm(84532, realmParcelId)` (Base Sepolia chain id).
 *
 * cPaarcel ownership stays on the Aarcade cartridge; GV only stores place state.
 * paymentEnabled is irrelevant for place (burns bag balance).
 */
export type Gv2dParcelKeyInput = {
  /** Preferred soft / cPaarcel / local numeric parcel id → parcelKeyFromUint */
  cPaarcelOrLocalParcelId?: string | number | null;
  /** Fallback when only a Realm NFT id is known → parcelKeyFromRealm(84532, id) */
  realmParcelId?: string | number | null;
};

export type Gv2dParcelKeyResolved = {
  parcelKey: string;
  scheme: 'uint' | 'realm';
  sourceId: string;
};

function parseNumericId(raw: string | number | null | undefined): string | null {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (!/^\d+$/.test(s)) return null;
  return s;
}

/** Pure local mirror of GvPlaceFacet.parcelKeyFromUint (bytes32 left-pad). */
export function parcelKeyFromUintLocal(parcelId: string | number): string {
  return ethers.utils.hexZeroPad(ethers.BigNumber.from(String(parcelId)).toHexString(), 32);
}

/** Pure local mirror of GvPlaceFacet.parcelKeyFromRealm. */
export function parcelKeyFromRealmLocal(
  chainId: number,
  realmParcelId: string | number,
): string {
  return ethers.utils.solidityKeccak256(
    ['uint256', 'uint256'],
    [chainId, ethers.BigNumber.from(String(realmParcelId))],
  );
}

/**
 * Resolve bytes32 parcel key for place/unequip.
 * Prefer uint(cPaarcelOrLocalParcelId); else realm(84532, realmParcelId).
 */
export function resolveGv2dParcelKey(input: Gv2dParcelKeyInput): Gv2dParcelKeyResolved {
  const localId = parseNumericId(input.cPaarcelOrLocalParcelId);
  if (localId != null) {
    return {
      parcelKey: parcelKeyFromUintLocal(localId),
      scheme: 'uint',
      sourceId: localId,
    };
  }
  const realmId = parseNumericId(input.realmParcelId);
  if (realmId != null) {
    return {
      parcelKey: parcelKeyFromRealmLocal(GV2D_BASE_SEPOLIA_CHAIN_ID, realmId),
      scheme: 'realm',
      sourceId: realmId,
    };
  }
  throw new Error(
    'Missing numeric parcel id for GV-2D place. Soft parcels need a numeric id/tokenId (parcelKeyFromUint); Realm-only parcels need a realm token id (parcelKeyFromRealm).',
  );
}

/**
 * Resolve place key from an active parcel object.
 * Soft / cPaarcel → uint(tokenId|id). Otherwise realm(84532, tokenId|id).
 */
export function resolveGv2dParcelKeyFromParcel(parcel: {
  id?: string | number | null;
  tokenId?: string | number | null;
  parcelId?: string | number | null;
}): Gv2dParcelKeyResolved {
  const tokenOrId = parcel.tokenId ?? parcel.id;
  const numeric = parseNumericId(tokenOrId);
  if (numeric == null) {
    throw new Error('Active parcel has no numeric id/tokenId for GV-2D place key.');
  }
  // Soft / cPaarcel (or any numeric local mirror): prefer uint key.
  // isCParcelInInventory is optional — any soft-launch parcel uses the same id space.
  return resolveGv2dParcelKey({ cPaarcelOrLocalParcelId: numeric });
}

export type Gv2dPlaceResult = {
  ok: true;
  txHash: string;
  placementId: string;
  balance: number;
  parcelKey: string;
  message: string;
};

export type Gv2dUnequipResult = {
  ok: true;
  txHash: string;
  balance: number;
  parcelKey: string;
  message: string;
};

/** In-memory installationId → on-chain placementId (session). */
const gv2dPlacementIdByInstallation = new Map<string, string>();

export function rememberGv2dPlacementId(installationId: string, placementId: string | number) {
  if (!installationId) return;
  gv2dPlacementIdByInstallation.set(installationId, String(placementId));
}

export function forgetGv2dPlacementId(installationId: string) {
  gv2dPlacementIdByInstallation.delete(installationId);
}

export function getRememberedGv2dPlacementId(installationId: string): string | undefined {
  return gv2dPlacementIdByInstallation.get(installationId);
}

function parsePlacementIdFromReceipt(
  receipt: { logs?: Array<{ topics?: string[]; data?: string }> },
  contract: ethers.Contract,
): string | null {
  try {
    for (const log of receipt.logs || []) {
      try {
        const parsed = contract.interface.parseLog(log as any);
        if (parsed?.name === 'SoftInstallPlaced' && parsed.args?.placementId != null) {
          return parsed.args.placementId.toString();
        }
      } catch {
        /* not our event */
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Place one soft install via diamond `placeSoftInstall(parcelKey, itemId, x, y)`.
 * Burns 1 from GV ERC1155 bag; syncs local bag from balanceOf after tx.
 */
export async function placeSoftInstallOnDiamond(opts: {
  parcelKey: string;
  itemId: number;
  x: number;
  y: number;
  account: string;
  signer: Signer;
  provider: providers.Provider;
  installationId?: string;
  name?: string;
}): Promise<Gv2dPlaceResult> {
  const { parcelKey, itemId, account, signer, provider, installationId, name } = opts;
  const x = Math.max(0, Math.floor(Number(opts.x)) || 0);
  const y = Math.max(0, Math.floor(Number(opts.y)) || 0);

  if (!isGv2dSoftInstallCraftId(itemId)) {
    throw new Error(`Item ${itemId} is not a soft-install id (162–215).`);
  }
  if (!account) {
    throw new Error('Connect your wallet to place soft installs on the GV-2D diamond.');
  }
  if (!parcelKey || parcelKey === ethers.constants.HashZero) {
    throw new Error('Invalid parcel key for GV-2D place.');
  }

  const { liveSigner, liveProvider } = await bindLiveSigner(
    signer,
    provider,
    'place soft installs on the GV-2D diamond',
  );

  const contract = getGv2dDiamondContract(liveSigner);
  const tx = await contract.placeSoftInstall(parcelKey, itemId, x, y, {
    ...(await gasPriceDict(liveSigner)),
  });
  const receipt = await tx.wait();
  if (receipt.status !== 1) {
    throw new Error('placeSoftInstall transaction failed');
  }

  let placementId =
    parsePlacementIdFromReceipt(receipt, contract) ||
    (await contract.cellPlacementId(parcelKey, x, y).then((v: any) => v?.toString?.() || String(v)));
  if (installationId && placementId) {
    rememberGv2dPlacementId(installationId, placementId);
  }

  let balance = 0;
  try {
    balance = await syncSoftInstallInventoryFromDiamond(account, itemId, liveProvider);
  } catch (e) {
    console.warn('[gv2d] soft-install balance sync after place failed; applying local -1', e);
    balance = applySoftInstallInventoryBalance(itemId, undefined, -1);
  }

  const label = name || `Install ${itemId}`;
  return {
    ok: true,
    txHash: receipt.transactionHash as string,
    placementId: String(placementId || '0'),
    balance,
    parcelKey,
    message: `Placed ${label} on GV-2D diamond`,
  };
}

/**
 * Unequip soft install covering cell (x,y) via `unequipSoftInstall`.
 * Mints 1 back to bag owner; syncs local bag from balanceOf.
 */
export async function unequipSoftInstallOnDiamond(opts: {
  parcelKey: string;
  x: number;
  y: number;
  itemId: number;
  account: string;
  signer: Signer;
  provider: providers.Provider;
  installationId?: string;
  name?: string;
}): Promise<Gv2dUnequipResult> {
  const { parcelKey, itemId, account, signer, provider, installationId, name } = opts;
  const x = Math.max(0, Math.floor(Number(opts.x)) || 0);
  const y = Math.max(0, Math.floor(Number(opts.y)) || 0);

  if (!isGv2dSoftInstallCraftId(itemId)) {
    throw new Error(`Item ${itemId} is not a soft-install id (162–215).`);
  }
  if (!account) {
    throw new Error('Connect your wallet to unequip soft installs on the GV-2D diamond.');
  }

  const { liveSigner, liveProvider } = await bindLiveSigner(
    signer,
    provider,
    'unequip soft installs on the GV-2D diamond',
  );

  const contract = getGv2dDiamondContract(liveSigner);

  // Prefer unequipSoftInstallById when we remembered placementId this session.
  const remembered = installationId ? getRememberedGv2dPlacementId(installationId) : undefined;
  let tx;
  if (remembered && remembered !== '0') {
    tx = await contract.unequipSoftInstallById(remembered, {
      ...(await gasPriceDict(liveSigner)),
    });
  } else {
    tx = await contract.unequipSoftInstall(parcelKey, x, y, {
      ...(await gasPriceDict(liveSigner)),
    });
  }
  const receipt = await tx.wait();
  if (receipt.status !== 1) {
    throw new Error('unequipSoftInstall transaction failed');
  }
  if (installationId) forgetGv2dPlacementId(installationId);

  let balance = 0;
  try {
    balance = await syncSoftInstallInventoryFromDiamond(account, itemId, liveProvider);
  } catch (e) {
    console.warn('[gv2d] soft-install balance sync after unequip failed; applying local +1', e);
    balance = applySoftInstallInventoryBalance(itemId, undefined, 1);
  }

  const label = name || `Install ${itemId}`;
  return {
    ok: true,
    txHash: receipt.transactionHash as string,
    balance,
    parcelKey,
    message: `Unequipped ${label} on GV-2D diamond`,
  };
}

/** Unequip by on-chain placement id (when known). */
export async function unequipSoftInstallByIdOnDiamond(opts: {
  placementId: string | number;
  itemId: number;
  account: string;
  signer: Signer;
  provider: providers.Provider;
  installationId?: string;
  name?: string;
  parcelKey?: string;
}): Promise<Gv2dUnequipResult> {
  const { placementId, itemId, account, signer, provider, installationId, name } = opts;
  if (!account) {
    throw new Error('Connect your wallet to unequip soft installs on the GV-2D diamond.');
  }
  if (!isGv2dSoftInstallCraftId(itemId)) {
    throw new Error(`Item ${itemId} is not a soft-install id (162–215).`);
  }

  const { liveSigner, liveProvider } = await bindLiveSigner(
    signer,
    provider,
    'unequip soft installs on the GV-2D diamond',
  );
  const contract = getGv2dDiamondContract(liveSigner);
  const tx = await contract.unequipSoftInstallById(placementId, {
    ...(await gasPriceDict(liveSigner)),
  });
  const receipt = await tx.wait();
  if (receipt.status !== 1) {
    throw new Error('unequipSoftInstallById transaction failed');
  }
  if (installationId) forgetGv2dPlacementId(installationId);

  let balance = 0;
  try {
    balance = await syncSoftInstallInventoryFromDiamond(account, itemId, liveProvider);
  } catch (e) {
    console.warn('[gv2d] soft-install balance sync after unequipById failed; applying local +1', e);
    balance = applySoftInstallInventoryBalance(itemId, undefined, 1);
  }

  const label = name || `Install ${itemId}`;
  return {
    ok: true,
    txHash: receipt.transactionHash as string,
    balance,
    parcelKey: opts.parcelKey || ethers.constants.HashZero,
    message: `Unequipped ${label} on GV-2D diamond`,
  };
}

/** Read on-chain placement id at cell (optional hydrate helper). */
export async function fetchGv2dCellPlacementId(
  parcelKey: string,
  x: number,
  y: number,
  provider: providers.Provider,
): Promise<string> {
  const contract = getGv2dDiamondContract(provider);
  const id = await contract.cellPlacementId(parcelKey, x, y);
  return id?.toString?.() || String(id);
}
