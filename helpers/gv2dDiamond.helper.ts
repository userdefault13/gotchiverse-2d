/**
 * FE bridge to the Gotchiverse-2D diamond (Base Sepolia) for soft cTiles 8–47.
 *
 * When NEXT_PUBLIC_USE_GV2D_DIAMOND=true, Crafting Table soft cTiles call
 * `mintTiles` on the diamond instead of `craftCTileLocally`.
 * Golden tiles 1–3 stay on the live Tile diamond / existing craftTiles path.
 *
 * Deployed diamond: packages/gv2d-diamond/deployments/base-sepolia.json
 * paymentEnabled=false on Sepolia — no alchemica approve required for mint.
 */
import { ethers, Signer } from 'ethers';
import type { providers } from 'ethers';
import Gv2dDiamondAbi from 'web3/abi/Gv2dDiamond.json';
import { gasPriceDict } from 'web3/web3';
import { CTILE_ID_END, CTILE_ID_START, isCTileItemId, applyCTileInventoryBalance } from 'helpers/ctile.helper';

/** Base Sepolia — GV-2D soft-tile diamond host chain. */
export const GV2D_BASE_SEPOLIA_CHAIN_ID = 84532;
export const GV2D_BASE_SEPOLIA_CHAIN_ID_HEX = '0x14a34';

/** Default from packages/gv2d-diamond/deployments/base-sepolia.json */
export const GV2D_DIAMOND_DEFAULT = '0x34a851523A6f3351940d235373038b2A0A85e872';

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
): Promise<void> {
  const chainId = await readChainId(provider);
  if (chainId === GV2D_BASE_SEPOLIA_CHAIN_ID) return;

  const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : undefined;
  if (!ethereum?.request) {
    throw new Error('Switch wallet to Base Sepolia (chain 84532) to mint soft cTiles on the GV-2D diamond.');
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
      throw new Error('Connect / switch to Base Sepolia to mint soft cTiles.');
    } else {
      throw new Error(
        err?.message || 'Switch wallet to Base Sepolia (chain 84532) to mint soft cTiles.',
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

export async function fetchGv2dTileBalance(
  account: string,
  itemId: number,
  provider: providers.Provider,
): Promise<number> {
  const contract = getGv2dDiamondContract(provider);
  const bal = await contract.balanceOf(account, itemId);
  return Number(bal.toString());
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
  const qty = await fetchGv2dTileBalance(account, itemId, provider);
  applyCTileInventoryBalance(itemId, qty);
  return qty;
}

export type Gv2dMintResult = {
  ok: true;
  txHash: string;
  balance: number;
  message: string;
};

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

  await ensureBaseSepoliaForGv2d(provider);

  // After a wallet switch, web3-react signer/provider can lag — prefer fresh EIP-1193 binding.
  let liveSigner: Signer = signer;
  let liveProvider: providers.Provider = provider;
  const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : undefined;
  if (ethereum) {
    const { Web3Provider } = await import('@ethersproject/providers');
    liveProvider = new Web3Provider(ethereum);
    liveSigner = (liveProvider as any).getSigner();
    await ensureBaseSepoliaForGv2d(liveProvider);
  }

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
