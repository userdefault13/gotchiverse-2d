/**
 * Soft-launch channeling for cAavegotchis / cParcels.
 * Credits session UI alchemica + local cooldowns (no Realm diamond TX).
 */

import GlobalState from 'contexts/GlobalState';
import Players from 'components/phaser/Players';
import { getActiveParcelByTokenId } from 'helpers/installations.helper';
import {
  calculateChannellingResults,
  gotchiCanChannel,
  secondsUntilGotchiCanChannel,
  secondsUntilParcelCanChannel,
} from 'helpers/parcels.helper';
import type { AlchemicaBalance } from 'types';

const STORAGE_KEY = 'gotchiverse.soft.channel.v1';

type SoftChannelWalletState = {
  parcels: Record<string, string>;
  gotchis: Record<string, string>;
};

type SoftChannelRoot = Record<string, SoftChannelWalletState>;

export type SoftChannelResult = {
  status: number;
  results: { fud: number; fomo: number; alpha: number; kek: number };
  nextBalance: AlchemicaBalance;
  lastChanneled: string;
  message?: string;
};

function normalizeWallet(raw: string | null | undefined): string | null {
  const w = String(raw || '')
    .trim()
    .toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(w)) return null;
  return w;
}

function readRoot(): SoftChannelRoot {
  if (typeof window === 'undefined') return {};
  try {
    return (JSON.parse(localStorage.getItem(STORAGE_KEY) || '') as SoftChannelRoot) || {};
  } catch {
    return {};
  }
}

function writeRoot(root: SoftChannelRoot) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
  } catch {
    /* ignore */
  }
}

function walletBucket(wallet: string): SoftChannelWalletState {
  const root = readRoot();
  const key = wallet.toLowerCase();
  if (!root[key]) root[key] = { parcels: {}, gotchis: {} };
  if (!root[key].parcels) root[key].parcels = {};
  if (!root[key].gotchis) root[key].gotchis = {};
  return root[key];
}

function persistWallet(wallet: string, bucket: SoftChannelWalletState) {
  const root = readRoot();
  root[wallet.toLowerCase()] = bucket;
  writeRoot(root);
}

function resolveWallet(): string | null {
  return (
    normalizeWallet(GlobalState.WEB3?.state?.currentAccount) ||
    normalizeWallet(Players.selectedPlayer?.owner?.split?.(':')?.[0]) ||
    normalizeWallet(Players.selectedPlayer?.owner)
  );
}

/** True when channeling should use the soft-launch local path. */
export function isSoftLaunchChannel(realmId?: number | string | null): boolean {
  if (Players.selectedPlayer?.isCartridgeHero) return true;
  const inventory = GlobalState.USER?.state?.parcelInventory || [];
  if (!inventory.length || realmId == null || realmId === '') return false;
  const id = String(realmId);
  return inventory.some((p) => String(p.realmTokenId) === id);
}

export function getSoftParcelLastChanneled(realmId: number | string, wallet?: string | null): string {
  const w = normalizeWallet(wallet) || resolveWallet();
  if (!w) return '0';
  const ts = walletBucket(w).parcels[String(realmId)];
  return ts != null && ts !== '' ? String(ts) : '0';
}

export function getSoftGotchiLastChanneled(gotchiId: string | number, wallet?: string | null): string {
  const w = normalizeWallet(wallet) || resolveWallet();
  if (!w) return '0';
  const ts = walletBucket(w).gotchis[String(gotchiId)];
  return ts != null && ts !== '' ? String(ts) : '0';
}

export function stampSoftChannel(params: {
  realmId: number | string;
  gotchiId: string | number;
  unixSec?: number;
  wallet?: string | null;
}): string {
  const w = normalizeWallet(params.wallet) || resolveWallet();
  if (!w) throw new Error('Wallet not connected for soft-launch channeling.');
  const now = String(params.unixSec ?? Math.floor(Date.now() / 1000));
  const bucket = walletBucket(w);
  bucket.parcels[String(params.realmId)] = now;
  bucket.gotchis[String(params.gotchiId)] = now;
  persistWallet(w, bucket);
  return now;
}

/**
 * Soft-launch channel: credit session alchemica, stamp local cooldowns.
 * Returns a tx-like `{ status: 1 }` for ParcelDashboard success UX.
 */
export function channelAlchemicaLocally(params: {
  altarId?: string;
  realmId: number | string;
  playerId: string | number;
  alchemicaBalance?: AlchemicaBalance | null;
}): SoftChannelResult {
  const { altarId, realmId, playerId } = params;
  if (realmId == null || realmId === '') {
    throw new Error('Parcel id missing for soft-launch channeling.');
  }
  if (playerId == null || playerId === '') {
    throw new Error('No Aavegotchi selected.');
  }

  const balance = params.alchemicaBalance || GlobalState.USER?.state?.alchemicaBalance;
  if (!balance) {
    throw new Error('Alchemica balance unavailable — reconnect and try again.');
  }

  const parcelLast = getSoftParcelLastChanneled(realmId);
  const gotchiLast = getSoftGotchiLastChanneled(playerId);
  const altarItemId = altarId ? String(altarId).split('_')[1] : undefined;
  const parcelWait = secondsUntilParcelCanChannel(parcelLast, altarItemId) ?? 0;
  const gotchiWait = secondsUntilGotchiCanChannel(gotchiLast);

  if (parcelWait > 0) {
    throw new Error('Parcel still on channel cooldown (soft-launch).');
  }
  if (!gotchiCanChannel(gotchiLast) || gotchiWait > 0) {
    throw new Error('Gotchi already channeled today (soft-launch). Resets at UTC midnight.');
  }

  const results = calculateChannellingResults({
    altarId,
    playerId: String(playerId),
  });

  const lastChanneled = stampSoftChannel({ realmId, gotchiId: playerId });

  const nextBalance: AlchemicaBalance = {
    fud: Number(balance.fud || 0) + results.fud,
    fomo: Number(balance.fomo || 0) + results.fomo,
    alpha: Number(balance.alpha || 0) + results.alpha,
    kek: Number(balance.kek || 0) + results.kek,
  };

  // Keep in-memory parcel cooldown in sync with Aaltar UI / Phaser icons.
  const parcel = getActiveParcelByTokenId(Number(realmId));
  if (parcel) {
    parcel.lastChanneledAlchemica = lastChanneled;
  }

  return {
    status: 1,
    results,
    nextBalance,
    lastChanneled,
    message: 'Channeled (soft-launch)',
  };
}
