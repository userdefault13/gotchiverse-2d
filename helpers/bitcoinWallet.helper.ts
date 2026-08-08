/**
 * MetaMask Bitcoin (native SegWit / P2WPKH) connect via Multichain CAIP-25.
 * Falls back gracefully when the extension has no Bitcoin account / snap yet.
 *
 * Scope: bip122 mainnet genesis hash (CAIP-2).
 * See https://docs.metamask.io/metamask-connect/multichain/
 */

import {
  getStoredBtcAddress,
  setBtcWalletSource,
  setStoredBtcAddress,
} from 'helpers/softNetwork.helper';
import { getBitcoinWalletStandard } from '@metamask/bitcoin-wallet-standard';
import {
  getDefaultTransport,
  getMultichainClient,
  getWindowPostMessageTransport,
} from '@metamask/multichain-api-client';

/** Bitcoin mainnet CAIP-2 */
export const BTC_BIP122_MAINNET = 'bip122:000000000019d6689c085ae165831e93';

export type MetaMaskBitcoinConnectResult = {
  address?: string;
  /** true when soft UI mode is active even if SegWit RPC failed */
  softOnly?: boolean;
  error?: string;
};

type WalletStandard = ReturnType<typeof getBitcoinWalletStandard>;

let walletStandard: WalletStandard | null = null;

function describeWalletError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const value = err as {
      message?: unknown;
      error?: unknown;
      cause?: unknown;
      data?: unknown;
      code?: unknown;
    };
    if (typeof value.message === 'string') return value.message;
    if (value.error) return describeWalletError(value.error);
    if (value.cause) return describeWalletError(value.cause);
    if (value.data) return describeWalletError(value.data);
  }
  return 'MetaMask could not share a Bitcoin account.';
}

function isUserRejection(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('user rejected') ||
    m.includes('user denied') ||
    m.includes('rejected the request') ||
    m.includes('request rejected') ||
    m.includes('user cancelled') ||
    m.includes('user canceled')
  );
}

function isUnsupportedMultichain(message: string): boolean {
  return (
    message.includes('wallet_createSession') ||
    message.includes('Method not found') ||
    message.includes('does not exist') ||
    message.includes('method not supported') ||
    message.toLowerCase().includes('unsupported method')
  );
}

/** Extract bc1/1/3 address from a CAIP-10 account id or plain address. */
function addressFromCaipAccount(accountId: string | undefined | null): string | undefined {
  if (!accountId) return undefined;
  const raw = String(accountId).trim();
  if (!raw) return undefined;
  // bip122:<genesis>:<address>
  const parts = raw.split(':');
  if (parts.length >= 3 && parts[0] === 'bip122') {
    return parts.slice(2).join(':') || undefined;
  }
  // Already a bare address
  if (/^(bc1|[13])/i.test(raw)) return raw;
  return undefined;
}

function addressFromSession(session: unknown): string | undefined {
  if (!session || typeof session !== 'object') return undefined;
  const scopes = (session as { sessionScopes?: Record<string, { accounts?: string[] }> }).sessionScopes;
  if (!scopes) return undefined;

  // Prefer mainnet bip122 scope; otherwise first bip122 scope with accounts.
  const preferred = scopes[BTC_BIP122_MAINNET];
  const preferredAddr = addressFromCaipAccount(preferred?.accounts?.[0]);
  if (preferredAddr) return preferredAddr;

  for (const [scope, value] of Object.entries(scopes)) {
    if (!scope.startsWith('bip122:')) continue;
    const addr = addressFromCaipAccount(value?.accounts?.[0]);
    if (addr) return addr;
  }
  return undefined;
}

function persistMetaMaskAddress(address: string): MetaMaskBitcoinConnectResult {
  setStoredBtcAddress(address);
  setBtcWalletSource('metamask');
  return { address };
}

function ethereumProvider(): { request: (args: { method: string; params?: unknown }) => Promise<unknown> } | null {
  if (typeof window === 'undefined') return null;
  // Prefer the provider the app already uses for EVM (injected MetaMask).
  const eth = (window as unknown as { ethereum?: { request?: (args: { method: string; params?: unknown }) => Promise<unknown> } })
    .ethereum;
  if (eth && typeof eth.request === 'function') return eth as { request: (args: { method: string; params?: unknown }) => Promise<unknown> };
  return null;
}

/**
 * Path A — direct injected provider.
 * Uses the same EIP-1193 channel the user already approved for Base/RH, so MetaMask
 * should open a CAIP-25 permission prompt for bip122 (Bitcoin).
 */
async function connectViaInjectedProvider(): Promise<MetaMaskBitcoinConnectResult | null> {
  const eth = ethereumProvider();
  if (!eth) return null;

  try {
    const session = await eth.request({
      method: 'wallet_createSession',
      params: {
        optionalScopes: {
          [BTC_BIP122_MAINNET]: {
            methods: [],
            notifications: [],
          },
        },
        sessionProperties: {
          // Helps MetaMask identify Bitcoin scope until property is renamed upstream.
          bip122_accountChanged_notifications: true,
        },
      },
    });

    const address = addressFromSession(session);
    if (address) return persistMetaMaskAddress(address);

    // Session ok but no BTC account selected — user may need to enable Bitcoin in MetaMask.
    const existing = getStoredBtcAddress();
    return {
      address: existing || undefined,
      softOnly: true,
      error:
        'MetaMask opened, but no Bitcoin account was shared. Add or enable a Bitcoin account in MetaMask, then try Connect BTC Wallet again.',
    };
  } catch (err: unknown) {
    const msg = describeWalletError(err);
    // Unsupported method → try wallet-standard transports instead of soft-failing.
    if (isUnsupportedMultichain(msg)) return null;
    if (isUserRejection(msg)) {
      return {
        softOnly: true,
        error: 'Bitcoin connection request was rejected in MetaMask.',
      };
    }
    // Other errors: still try fallback paths (transport may work when ethereum doesn't).
    console.warn('[bitcoin] injected wallet_createSession failed, trying wallet-standard:', msg);
    return null;
  }
}

function buildWalletStandard(preferPostMessage: boolean): WalletStandard {
  if (typeof window === 'undefined') {
    throw new Error('MetaMask Bitcoin connection is only available in a browser.');
  }
  const transport = preferPostMessage
    ? getWindowPostMessageTransport({ defaultTimeout: -1 })
    : getDefaultTransport({ defaultTimeout: -1 });
  const client = getMultichainClient({ transport });
  return getBitcoinWalletStandard({
    client,
    walletName: 'MetaMask Bitcoin',
  });
}

/**
 * Path B/C — MetaMask bitcoin-wallet-standard (createSession under the hood).
 * Prefer window.postMessage (content-script path) so we don't depend on chrome.runtime
 * externally_connectable, which often never surfaces a prompt from regular pages.
 */
async function connectViaWalletStandard(preferPostMessage: boolean): Promise<MetaMaskBitcoinConnectResult> {
  // Drop prior singleton so we always create a fresh session attempt (re-prompt).
  walletStandard = null;
  const wallet = buildWalletStandard(preferPostMessage);
  walletStandard = wallet;

  const { accounts } = await wallet.features['bitcoin:connect'].connect({
    purposes: ['payment'],
  });
  const address = accounts[0]?.address;
  if (address) return persistMetaMaskAddress(address);

  const existing = getStoredBtcAddress();
  return {
    address: existing || undefined,
    softOnly: true,
    error:
      'MetaMask connected, but no Bitcoin (SegWit) account was shared. Add a Bitcoin account in MetaMask, then try again.',
  };
}

/**
 * Request a MetaMask multichain session for Bitcoin mainnet and return a SegWit address when granted.
 * Order: injected ethereum wallet_createSession → postMessage wallet-standard → default transport.
 */
export async function connectMetaMaskBitcoinSegwit(): Promise<MetaMaskBitcoinConnectResult> {
  if (typeof window === 'undefined') {
    return { softOnly: true, error: 'MetaMask Bitcoin connection is only available in a browser.' };
  }

  // 1) Injected provider — most reliable prompt when user is already EVM-connected.
  // Returns null only when wallet_createSession is unsupported (try other transports).
  // Any real response (address / rejection / empty accounts) means MetaMask was already prompted.
  const injected = await connectViaInjectedProvider();
  if (injected) return injected;

  // 2) Wallet-standard via window.postMessage (content script) — works without chrome.runtime.
  try {
    return await connectViaWalletStandard(true);
  } catch (err: unknown) {
    const msg = describeWalletError(err);
    console.warn('[bitcoin] postMessage wallet-standard connect failed:', msg);

    // 3) Default transport (Chrome externally_connectable when available).
    try {
      return await connectViaWalletStandard(false);
    } catch (err2: unknown) {
      const msg2 = describeWalletError(err2);
      console.warn('[bitcoin] default-transport wallet-standard connect failed:', msg2);
      const existing = getStoredBtcAddress();
      const combined = msg2 || msg || 'MetaMask could not share a Bitcoin account.';
      return {
        address: existing || undefined,
        softOnly: true,
        error: isUnsupportedMultichain(combined)
          ? 'This MetaMask build has no Bitcoin multichain API yet. Soft Bitcoin mode is still available; update MetaMask for SegWit connect.'
          : isUserRejection(combined)
            ? 'Bitcoin connection request was rejected in MetaMask.'
            : combined,
      };
    }
  }
}

/** Prefer stored SegWit address for display; else fall back to EVM address. */
export function displayAddressForNetwork(network: string | undefined, evmAddress?: string | null): string {
  if (network === 'bitcoin') {
    return getStoredBtcAddress() || evmAddress || '';
  }
  return evmAddress || '';
}

/**
 * Read MetaMask Bitcoin (SegWit) spendable balance in sats.
 * Does NOT prompt MetaMask — only uses a stored / hinted address (connect is user-initiated).
 */
export async function fetchMetaMaskBitcoinBalanceSats(addressHint?: string | null): Promise<{
  address?: string;
  sats: bigint | null;
  source?: 'metamask' | 'mempool' | 'none';
  error?: string;
}> {
  const address = (addressHint || getStoredBtcAddress() || '').trim() || undefined;

  if (!address) {
    return { sats: null, source: 'none', error: 'No MetaMask Bitcoin address connected.' };
  }

  // Confirmed + pending balance (chain_stats / mempool_stats).
  try {
    const res = await fetch(`https://mempool.space/api/address/${encodeURIComponent(address)}`, {
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      return { address, sats: null, source: 'none', error: 'Could not read Bitcoin balance.' };
    }
    const funded =
      BigInt(data?.chain_stats?.funded_txo_sum || 0) + BigInt(data?.mempool_stats?.funded_txo_sum || 0);
    const spent =
      BigInt(data?.chain_stats?.spent_txo_sum || 0) + BigInt(data?.mempool_stats?.spent_txo_sum || 0);
    const sats = funded > spent ? funded - spent : BigInt(0);
    return { address, sats, source: 'mempool' };
  } catch (err: unknown) {
    return {
      address,
      sats: null,
      source: 'none',
      error: err instanceof Error ? err.message : 'Could not read Bitcoin balance.',
    };
  }
}
