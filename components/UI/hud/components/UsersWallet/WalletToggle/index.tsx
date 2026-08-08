import styles from './styles';
import { BaseIcon, BitcoinIcon, RhIcon } from 'assets';
import { IndentedPanel } from 'components/UI/component/panels';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { addBase, addBitcoin, addRobinhood, smartTrim } from 'helpers/ethers.helper';
import { displayAddressForNetwork } from 'helpers/bitcoinWallet.helper';
import { getStoredBtcAddress } from 'helpers/softNetwork.helper';
import { NetworkNames } from 'types';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useUserWalletDataContext } from 'components/utility/WalletConnect';
import { ChainId } from 'components/utility/WalletConnect/data-provider/chains';
import { useWeb3 } from 'contexts/Web3Context';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface Props {
  address: string;
  network: NetworkNames;
  onClick?: () => void;
}

const networkLabel = (network: NetworkNames): string => {
  if (network === 'matic') return 'polygon';
  if (network === 'robinhood') return 'Robinhood';
  if (network === 'bitcoin') return 'Bitcoin';
  return network;
};

export const WalletToggle = ({ address, network, onClick }: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const walletCtx = useUserWalletDataContext();
  const [, web3Dispatch] = useWeb3();
  const [btcAddress, setBtcAddress] = useState<string | null>(() => getStoredBtcAddress());
  const isRobinhood = network === 'robinhood';
  const isBase = network === 'base';
  const isBitcoin = network === 'bitcoin';
  const btcConnected = Boolean(btcAddress);
  // Hide "Connect BTC Wallet" when already linked; keep "Switch to BTC" on other networks.
  const showBtcAction = !isBitcoin || !btcConnected;
  const showSwitchToBase = network !== 'base';
  const showSwitchToRh = network !== 'robinhood';
  const displayAddress = displayAddressForNetwork(network, address);

  useEffect(() => {
    const refresh = () => setBtcAddress(getStoredBtcAddress());
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener('btc-wallet-updated', refresh);
    window.addEventListener('aarcade-soft-network', refresh);
    return () => {
      window.removeEventListener('btc-wallet-updated', refresh);
      window.removeEventListener('aarcade-soft-network', refresh);
    };
  }, []);

  const handleClick = (e) => {
    e.stopPropagation();

    if (!onClick) return;
    click();
    onClick();
  };

  const handleSwitchToBase = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    click();
    walletCtx?.handleNetworkChange?.(ChainId.base);
    await addBase();
    web3Dispatch({ type: 'UPDATE_CURRENT_NETWORK', currentNetwork: 'base' });
  };

  const handleSwitchToRh = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    click();
    walletCtx?.handleNetworkChange?.(ChainId.robinhood);
    await addRobinhood();
    web3Dispatch({ type: 'UPDATE_CURRENT_NETWORK', currentNetwork: 'robinhood' });
  };

  const handleSwitchToBtc = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    click();
    await addBitcoin();
    web3Dispatch({ type: 'UPDATE_CURRENT_NETWORK', currentNetwork: 'bitcoin' });
  };

  return (
    <>
      <div className="wallet-toggle-container" onClick={handleClick} onMouseDown={(e) => e.stopPropagation()}>
        <IndentedPanel hideSides={{ top: true }} secondaryColor padding={2} isWalletToggle isButton={true} isThin={true}>
          <div className="inner">
            <div className="jazzicon">
              <Jazzicon diameter={28} seed={jsNumberForAddress(address || '')} />
            </div>
            <div className="user-details">
              <p className="address">{smartTrim(displayAddress, 6)}</p>
              <p className="network">
                {isRobinhood && (
                  <span className="network-icon">
                    <Image alt="" src={RhIcon} width={16} height={16} />
                  </span>
                )}
                {isBase && (
                  <span className="network-icon">
                    <Image alt="" src={BaseIcon} width={16} height={16} />
                  </span>
                )}
                {isBitcoin && (
                  <span className="network-icon">
                    <Image alt="" src={BitcoinIcon} width={16} height={16} />
                  </span>
                )}
                {networkLabel(network)}
              </p>
              {showBtcAction && (
                <button type="button" className="switch-network" onClick={handleSwitchToBtc} onMouseDown={(e) => e.stopPropagation()}>
                  {isBitcoin ? 'Connect BTC Wallet' : 'Switch to BTC'}
                </button>
              )}
              {showSwitchToRh && (
                <button type="button" className="switch-network" onClick={handleSwitchToRh} onMouseDown={(e) => e.stopPropagation()}>
                  Switch to RH
                </button>
              )}
              {showSwitchToBase && (
                <button type="button" className="switch-network" onClick={handleSwitchToBase} onMouseDown={(e) => e.stopPropagation()}>
                  Switch to Base
                </button>
              )}
            </div>
          </div>
        </IndentedPanel>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
