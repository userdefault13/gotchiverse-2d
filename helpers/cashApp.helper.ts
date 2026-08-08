/** Aarcade Cash App invite — used for BTC soft-track funding UX. */
export const CASH_APP_REFERRAL_CODE = 'ZJJBHJZ';

/** Official Cash App invite / install link with referral. */
export const CASH_APP_REFERRAL_URL = `https://cash.app/app/${CASH_APP_REFERRAL_CODE}`;

/** Cash App Bitcoin product page (existing users). */
export const CASH_APP_BITCOIN_URL = 'https://cash.app/bitcoin';

/** BIP-21 payment URI for QR (Cash App scans on-chain send). */
export function bitcoinPaymentUri(address: string, amountBtc?: number): string {
  const addr = String(address || '').trim();
  if (!addr) return '';
  if (amountBtc != null && Number.isFinite(amountBtc) && amountBtc > 0) {
    return `bitcoin:${addr}?amount=${amountBtc}`;
  }
  return `bitcoin:${addr}`;
}
