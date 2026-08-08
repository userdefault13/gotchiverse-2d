/**
 * Soft app-network pin for non-EVM tracks (Bitcoin).
 * MetaMask stays on Base/RH for EIP-1193; UI + cartridge routing use this flag.
 *
 * Cash App has no browser provider — users paste their Cash App BTC deposit address.
 */

export type SoftNetworkName = 'bitcoin';
export type BtcWalletSource = 'metamask' | 'cashapp' | 'manual';

const SOFT_NETWORK_KEY = 'aarcadeSoftNetwork';
const BTC_ADDRESS_KEY = 'aarcadeBtcAddress';
const BTC_SOURCE_KEY = 'aarcadeBtcWalletSource';

export function getSoftNetwork(): SoftNetworkName | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(SOFT_NETWORK_KEY) === 'bitcoin' ? 'bitcoin' : null;
  } catch {
    return null;
  }
}

export function setSoftNetwork(network: SoftNetworkName | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (network) localStorage.setItem(SOFT_NETWORK_KEY, network);
    else localStorage.removeItem(SOFT_NETWORK_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredBtcAddress(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(BTC_ADDRESS_KEY);
  } catch {
    return null;
  }
}

export function setStoredBtcAddress(address: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (address) localStorage.setItem(BTC_ADDRESS_KEY, address);
    else localStorage.removeItem(BTC_ADDRESS_KEY);
  } catch {
    /* ignore */
  }
}

export function getBtcWalletSource(): BtcWalletSource | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(BTC_SOURCE_KEY);
    if (v === 'metamask' || v === 'cashapp' || v === 'manual') return v;
    return null;
  } catch {
    return null;
  }
}

export function setBtcWalletSource(source: BtcWalletSource | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (source) localStorage.setItem(BTC_SOURCE_KEY, source);
    else localStorage.removeItem(BTC_SOURCE_KEY);
  } catch {
    /* ignore */
  }
}

/** Basic mainnet BTC address check (SegWit / Taproot / legacy). */
export function isPlausibleBtcAddress(raw: string): boolean {
  const a = String(raw || '').trim();
  if (!a || a.length < 26 || a.length > 90) return false;
  if (/^bc1[ac-hj-np-z02-9]{14,74}$/i.test(a)) return true;
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a)) return true;
  return false;
}

export function linkCashAppBtcAddress(address: string): { ok: true; address: string } | { ok: false; error: string } {
  const trimmed = String(address || '').trim();
  if (!isPlausibleBtcAddress(trimmed)) {
    return { ok: false, error: 'Paste a Cash App Bitcoin deposit address (bc1… / 1… / 3…).' };
  }
  setSoftNetwork('bitcoin');
  setStoredBtcAddress(trimmed);
  setBtcWalletSource('cashapp');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('btc-wallet-updated', { detail: { address: trimmed, source: 'cashapp' } }),
    );
    window.dispatchEvent(
      new CustomEvent('aarcade-soft-network', { detail: { network: 'bitcoin', address: trimmed } }),
    );
  }
  return { ok: true, address: trimmed };
}

export function clearBitcoinSoftTrack(): void {
  setSoftNetwork(null);
  setStoredBtcAddress(null);
  setBtcWalletSource(null);
}
