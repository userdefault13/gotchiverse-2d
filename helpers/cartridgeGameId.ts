/**
 * Per-chain Aarcade cartridge gameIds so Base and Robinhood mints stay separate.
 *
 * Soft-launch RH cartridges were created under the unscoped root (`gotchiverse`).
 * RH lookup falls back to that root; Base never does.
 */

const ROOT_GAME_ID = (process.env.NEXT_PUBLIC_AARCADE_CARTRIDGE_GAME_ID || 'gotchiverse').toLowerCase();

export function cartridgeRootGameId(): string {
  return ROOT_GAME_ID;
}

/** Active mint/lookup gameId for the wallet's current network. */
export function cartridgeGameIdForNetwork(network?: string | null): string {
  if (network === 'robinhood') return `${ROOT_GAME_ID}-rh`;
  return `${ROOT_GAME_ID}-base`;
}

/**
 * Legacy soft-launch gameId to accept on RH only (existing mints under bare `gotchiverse`).
 * Base must not fall back — otherwise RH cartridges would unlock Base.
 */
export function cartridgeLegacyGameIdForNetwork(network?: string | null): string | null {
  if (network === 'robinhood') return ROOT_GAME_ID;
  return null;
}

export function cartridgeLocalStorageKey(gameId: string): string {
  return `aarcadeCartridgeId:${gameId}`;
}
