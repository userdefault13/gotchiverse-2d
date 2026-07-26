import { disconnectWeb3Connector } from 'components/utility/WalletConnect/data-provider/connectors';
import { colyseusDisconnect, isColyseusNetcode } from 'helpers/colyseus.client';

/** Clear session + wallet and leave the game. Safe to call from HUD / modals. */
export function performLogOut(): void {
  try {
    if (isColyseusNetcode()) colyseusDisconnect();
  } catch (err) {
    console.warn('performLogOut: colyseus disconnect failed', err);
  }

  try {
    localStorage.removeItem('selectedPlayer');
    localStorage.removeItem('gotchiExtras');
    localStorage.removeItem('selectedAccount');
    localStorage.removeItem('currentProvider');
    localStorage.removeItem('walletconnect');
    localStorage.removeItem('mockWalletAddress');
  } catch {
    // ignore storage errors
  }

  try {
    disconnectWeb3Connector();
  } catch (err) {
    console.warn('performLogOut: connector disconnect failed', err);
  }

  // Hard navigate — do not depend on React router / Phaser teardown.
  window.location.replace('/');
}
