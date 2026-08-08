import { BaseIcon, BitcoinIcon, PolygonIcon, RhIcon } from 'assets';
import { TopNotification } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { useUser } from 'contexts/UserContext';
import { fetchAndSetMaticBalance } from 'contexts/UserContext/actions';
import { useWeb3 } from 'contexts/Web3Context';
import { fetchMetaMaskBitcoinBalanceSats } from 'helpers/bitcoinWallet.helper';
import { getBtcWalletSource, getStoredBtcAddress } from 'helpers/softNetwork.helper';
import { CashAppBuyBtcModal } from 'components/UI/widgets/CashAppBuyBtcModal';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import styles from './styles';

/** Polygon MATIC is cheap; Base / RH ETH gas needs only a tiny float. */
const MIN_GAS_BALANCE: Record<string, number> = {
  base: 0.00005,
  robinhood: 0.00005,
  matic: 0.1,
  mumbai: 0.1,
};

/**
 * Soft BTC transfer fee floor (matches Aarcade SRC-721 SIM default):
 * TRANSFER_VBYTES (220) × fee rate 8 sat/vB = 1760 sats.
 */
const MIN_SATS_FOR_TRANSFER = Number(process.env.NEXT_PUBLIC_BTC_MIN_SATS_TRANSFER || 1760);

const isEthGasNetwork = (network?: string): boolean => network === 'base' || network === 'robinhood';

export const MaticNeeded = (): JSX.Element => {
  const [{ maticBalance }, userDispatch] = useUser();
  const [{ currentAccount, globalProvider, currentNetwork }] = useWeb3();
  const isBitcoin = currentNetwork === 'bitcoin';
  const usesEthGas = isEthGasNetwork(currentNetwork);
  const isRobinhood = currentNetwork === 'robinhood';

  const [walletSats, setWalletSats] = useState<bigint | null>(null);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [btcBalanceReady, setBtcBalanceReady] = useState(false);
  const [cashAppModalOpen, setCashAppModalOpen] = useState(false);

  const refreshBtcWallet = useCallback(async () => {
    if (!isBitcoin) {
      setWalletSats(null);
      setBtcAddress(null);
      setBtcBalanceReady(false);
      return;
    }
    const storedMetaMaskAddress =
      getBtcWalletSource() === 'metamask' ? getStoredBtcAddress() : null;
    const result = await fetchMetaMaskBitcoinBalanceSats(storedMetaMaskAddress);
    setBtcAddress(result.address || null);
    setWalletSats(result.sats);
    setBtcBalanceReady(true);
  }, [isBitcoin]);

  useEffect(() => {
    if (isBitcoin) return;
    if (currentAccount && globalProvider && currentNetwork) {
      const web3Options = { provider: globalProvider, account: currentAccount, network: currentNetwork };
      void fetchAndSetMaticBalance(web3Options, userDispatch);
    }
  }, [currentAccount, globalProvider, currentNetwork, userDispatch, isBitcoin]);

  useEffect(() => {
    if (!isBitcoin) return;
    void refreshBtcWallet();
    const onUp = () => void refreshBtcWallet();
    window.addEventListener('btc-wallet-updated', onUp);
    window.addEventListener('aarcade-soft-network', onUp);
    const t = setInterval(() => void refreshBtcWallet(), 20_000);
    return () => {
      window.removeEventListener('btc-wallet-updated', onUp);
      window.removeEventListener('aarcade-soft-network', onUp);
      clearInterval(t);
    };
  }, [isBitcoin, refreshBtcWallet]);

  // Soft Bitcoin: banner when MetaMask BTC balance is too low / not linked — fund via Cash App modal.
  if (isBitcoin) {
    const minSats = BigInt(Math.max(1, Math.floor(MIN_SATS_FOR_TRANSFER)));
    const noAddress = btcBalanceReady && !btcAddress;
    const lowBalance = btcBalanceReady && btcAddress != null && walletSats !== null && walletSats < minSats;
    const show = noAddress || lowBalance;
    const title = noAddress ? 'Connect MetaMask Bitcoin' : "You're out of BTC!";

    return (
      <>
        <div className={`notification-container ${show ? 'visible' : ''}`}>
          <TopNotification accent="btc">
            <div className="inner">
              <span className="eth-icon btc-icon">
                <Image alt="" src={BitcoinIcon} width={40} height={40} />
              </span>
              <div className="content">
                <p>{title}</p>
                <p className="btc-sub">
                  {noAddress
                    ? 'Approve the MetaMask Bitcoin prompt (wallet menu → Connect BTC Wallet), then fund via Cash App.'
                    : 'Buy on Cash App, then send to your MetaMask Bitcoin address.'}
                </p>
                <Button size={1.8} fullWidth secondary onClick={() => setCashAppModalOpen(true)}>
                  {noAddress ? 'Connect / Buy BTC' : 'Buy BTC with Cash App'}
                </Button>
              </div>
            </div>
          </TopNotification>
        </div>
        <CashAppBuyBtcModal
          open={cashAppModalOpen}
          onClose={() => {
            setCashAppModalOpen(false);
            void refreshBtcWallet();
          }}
        />
        <style jsx>{styles}</style>
      </>
    );
  }

  const minBalance = MIN_GAS_BALANCE[currentNetwork || ''] ?? 0.1;
  const hasBalance = maticBalance !== undefined ? maticBalance >= minBalance : true;

  // ETH-gas chains: only show when native ETH is critically low.
  if (usesEthGas && hasBalance) {
    return <></>;
  }

  const title = usesEthGas ? "You're out of ETH!" : "You're out of MATIC!";
  const swapHref = isRobinhood
    ? 'https://robinhoodchain.blockscout.com/'
    : usesEthGas
      ? 'https://bridge.base.org/'
      : 'https://wallet.polygon.technology/gas-swap/';
  const buttonLabel = isRobinhood ? 'Get ETH on RH' : usesEthGas ? 'Bridge ETH to Base' : 'Swap for Gas Token';
  const chainIcon = isRobinhood ? RhIcon : usesEthGas ? BaseIcon : PolygonIcon;

  return (
    <>
      <div className={`notification-container ${!hasBalance ? 'visible' : ''}`}>
        <TopNotification>
          <div className="inner">
            {!usesEthGas && <Image alt="" src={PolygonIcon} width={54} height={54} />}
            {usesEthGas && (
              <span className="eth-icon">
                <Image alt="" src={chainIcon} width={40} height={40} />
              </span>
            )}
            <div className="content">
              <p>{title}</p>
              <a href={swapHref} target="_blank" rel="noreferrer">
                <Button size={1.8} fullWidth secondary>
                  {buttonLabel}
                </Button>
              </a>
            </div>
          </div>
        </TopNotification>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
