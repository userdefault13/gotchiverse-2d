/**
 * FE bridge to the Gotchiverse-2D diamond (Base Sepolia) for:
 * - soft cTiles 8–47 → `mintTiles`
 * - soft installs 162–215 → `craftInstallations` (GvCraftFacet)
 *
 * When NEXT_PUBLIC_USE_GV2D_DIAMOND=true, Crafting Table soft recipes call the
 * diamond instead of `*Locally` helpers. Golden tiles 1–3 and L1 Installation
 * diamond crafts stay on their existing paths.
 *
 * Deployed diamond: packages/gv2d-diamond/deployments/base-sepolia.json
 * paymentEnabled=false on Sepolia — no alchemica approve required for mint/craft.
 * Soft-install bag SoT = GV-2D ERC1155 (ids 162–215).
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
