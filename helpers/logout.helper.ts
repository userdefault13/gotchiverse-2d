import { disconnectWeb3Connector } from 'components/utility/WalletConnect/data-provider/connectors';
import { colyseusDisconnect, isColyseusNetcode } from 'helpers/colyseus.client';

function leaveRealmSession(clearWallet: boolean): void {
  try {
    if (isColyseusNetcode()) colyseusDisconnect();
  } catch (err) {
    console.warn('leaveRealmSession: colyseus disconnect failed', err);
  }

  try {
    localStorage.removeItem('selectedPlayer');
    localStorage.removeItem('gotchiExtras');
    if (clearWallet) {
      localStorage.removeItem('selectedAccount');
      localStorage.removeItem('currentProvider');
      localStorage.removeItem('walletconnect');
      localStorage.removeItem('mockWalletAddress');
    }
  } catch {
    // ignore storage errors
  }

  if (clearWallet) {
    try {
      disconnectWeb3Connector();
    } catch (err) {
      console.warn('leaveRealmSession: connector disconnect failed', err);
    }
  }

  // Hard navigate — do not depend on React router / Phaser teardown.
  window.location.replace('/');
}

/** Clear session + wallet and leave the game. Safe to call from HUD / modals. */
export function performLogOut(): void {
  leaveRealmSession(true);
}

/** Leave the game back to home, but keep the wallet connected. */
export function performGoHome(): void {
  leaveRealmSession(false);
}
