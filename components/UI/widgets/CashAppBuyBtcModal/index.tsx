import { Button } from 'components/UI/elements';
import { ModalWrapper } from 'components/UI/component';
import {
  CASH_APP_REFERRAL_CODE,
  CASH_APP_REFERRAL_URL,
  bitcoinPaymentUri,
} from 'helpers/cashApp.helper';
import { connectMetaMaskBitcoinSegwit, fetchMetaMaskBitcoinBalanceSats } from 'helpers/bitcoinWallet.helper';
import { getBtcWalletSource, getStoredBtcAddress } from 'helpers/softNetwork.helper';
import QRCode from 'qrcode';
import { useCallback, useEffect, useState } from 'react';
import styles from './styles';

interface Props {
  open: boolean;
  onClose: () => void;
}

function errorMessage(value: unknown): string {
  if (typeof value === 'string') {
    return value === '[object Object]'
      ? 'MetaMask could not share a Bitcoin account. Update MetaMask and add a Bitcoin account.'
      : value;
  }
  if (value instanceof Error) return value.message;
  if (value && typeof value === 'object') {
    const candidate = value as { message?: unknown; error?: unknown };
    if (typeof candidate.message === 'string') return candidate.message;
    if (typeof candidate.error === 'string') return candidate.error;
  }
  return 'Could not connect MetaMask Bitcoin. Update MetaMask and add a Bitcoin account.';
}

export const CashAppBuyBtcModal = ({ open, onClose }: Props): JSX.Element => {
  const [mmAddress, setMmAddress] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const loadReceiveAddress = useCallback(async (forceConnect = false) => {
    setBusy(true);
    setError(null);
    try {
      let address = getBtcWalletSource() === 'metamask' ? getStoredBtcAddress() : null;
      if (!address || forceConnect) {
        const connected = await connectMetaMaskBitcoinSegwit();
        address = connected.address || null;
        if (!address && connected.error) {
          setError(errorMessage(connected.error));
        }
      }
      if (address) {
        // Refresh balance source / confirm address still valid.
        const bal = await fetchMetaMaskBitcoinBalanceSats(address);
        address = bal.address || address;
      }
      setMmAddress(address);
      if (address) {
        const uri = bitcoinPaymentUri(address);
        const dataUrl = await QRCode.toDataURL(uri, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 280,
          color: { dark: '#000000', light: '#ffffff' },
        });
        setQrDataUrl(dataUrl);
      } else {
        setQrDataUrl(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load MetaMask Bitcoin address.');
      setQrDataUrl(null);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setCodeCopied(false);
    void loadReceiveAddress(false);
  }, [open, loadReceiveAddress]);

  const openReferral = () => {
    window.open(CASH_APP_REFERRAL_URL, '_blank', 'noopener,noreferrer');
  };

  const copyAddress = async () => {
    if (!mmAddress) return;
    try {
      await navigator.clipboard.writeText(mmAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy address — select and copy manually.');
    }
  };

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(CASH_APP_REFERRAL_CODE);
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setError(`Referral code: ${CASH_APP_REFERRAL_CODE}`);
    }
  };

  return (
    <ModalWrapper open={open} onClose={onClose}>
      <div className="cashapp-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="brand-header">
          <span className="cashapp-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" role="img">
              <rect width="64" height="64" rx="14" fill="#00D64F" />
              <path
                fill="#fff"
                d="M39.8 18.2c-1.8-1-4-1.7-6.4-1.9v-5h-5v5.2c-6.2 1-10.4 4.8-10.4 9.8 0 5.8 4.7 8.3 10.9 10.1 4.3 1.3 6 2.4 6 4.5 0 2.2-2 3.7-5.2 3.7-3.6 0-6.9-1.3-9.6-3.2l-3.2 6.2c3 2.2 7.1 3.7 11.4 4v5.1h5v-5.4c6.5-1.1 10.6-5.3 10.6-10.6 0-5.4-3.4-8.4-10.6-10.6-4.7-1.5-6.3-2.4-6.3-4.3 0-1.7 1.7-3 4.4-3 3 0 5.6 1 7.7 2.3l2.7-6.9z"
              />
            </svg>
          </span>
          <div>
            <h2 className="title">Buy BTC with Cash App</h2>
            <span className="brand-name">CASH APP → METAMASK</span>
          </div>
        </div>
        <p className="lead">
          Sign up or open Cash App, buy Bitcoin, then send it to your MetaMask Bitcoin address below.
        </p>

        <ol className="steps">
          <li className="step cashapp-step">
            <span className="step-label">1 · Cash App</span>
            <div className="referral-cards">
              <article className="referral-card">
                <div className="referral-visual qr-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="cashapp-qr"
                    src="/images/cash-app-referral-qr.svg"
                    alt="Cash App referral QR"
                  />
                </div>
                <h3>Get Cash App</h3>
                <p>Scan with your phone to download or open Cash App.</p>
                <span className="cashapp-cta">
                  <Button size={1.8} secondary onClick={openReferral}>
                    Open referral
                  </Button>
                </span>
              </article>

              <article className="referral-card">
                <div className="referral-visual code-card">
                  <button type="button" className="code-button" onClick={() => void copyReferralCode()}>
                    <span>{CASH_APP_REFERRAL_CODE}</span>
                    <span className="copy-glyph" aria-hidden="true">▣</span>
                  </button>
                </div>
                <h3>Enter AarcadeGhst&apos;s code</h3>
                <p>Create your account, then enter the referral code.</p>
                <button type="button" className="text-action" onClick={() => void copyReferralCode()}>
                  {codeCopied ? 'Code copied!' : 'Copy referral code'}
                </button>
              </article>

              <article className="referral-card">
                <div className="referral-visual send-card">
                  <span className="send-amount">$5</span>
                  <div className="keypad" aria-hidden="true">
                    <span>1</span><span>2</span><span>3</span>
                    <span>4</span><span>5</span><span>6</span>
                  </div>
                </div>
                <h3>Send $5+</h3>
                <p>Send money within 14 days to unlock the referral bonus for you and AarcadeGhst.</p>
              </article>
            </div>
          </li>

          <li className="step">
            <span className="step-label">2 · Buy Bitcoin</span>
            <p>
              On your phone, open Cash App and tap Bitcoin → Buy. Purchase enough BTC for transaction fees—a few
              dollars is plenty for soft launch.
            </p>
          </li>

          <li className="step">
            <span className="step-label">3 · Send to MetaMask</span>
            <p>
              Cash App → Bitcoin → Send → scan this QR (or paste the address). That funds MetaMask for Aarena
              transactions.
            </p>
            {error && <p className="error">{error}</p>}
            {mmAddress && qrDataUrl ? (
              <div className="qr-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="qr" src={qrDataUrl} alt="MetaMask Bitcoin receive QR" />
                <div className="address-row">
                  <div className="addr">{mmAddress}</div>
                  <Button size={1.8} secondary onClick={() => void copyAddress()}>
                    {copied ? 'Copied!' : 'Copy address'}
                  </Button>
                </div>
                <p className="hint">Scan in Cash App Send · BIP-21 bitcoin: URI</p>
              </div>
            ) : (
              <p className="hint">
                {busy
                  ? 'Loading your MetaMask Bitcoin receive QR…'
                  : 'Add a Bitcoin account in MetaMask to load its SegWit receive QR automatically.'}
              </p>
            )}
          </li>
        </ol>

        <p className="footer-note">Referral: cash.app/app/{CASH_APP_REFERRAL_CODE}</p>
      </div>
      <style jsx>{styles}</style>
    </ModalWrapper>
  );
};
