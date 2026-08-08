import { BaseIcon, BitcoinIcon, RhIcon } from 'assets';
import { addBase, addBitcoin, addRobinhood, smartTrim } from 'helpers/ethers.helper';
import { displayAddressForNetwork } from 'helpers/bitcoinWallet.helper';
import { getStoredBtcAddress } from 'helpers/softNetwork.helper';
import React, { useEffect, useState } from 'react';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import styles from './styles';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { PanelButton } from 'components/UI/elements';
import { useUserWalletDataContext } from 'components/utility/WalletConnect';
import { ChainId } from 'components/utility/WalletConnect/data-provider/chains';
import { useWeb3 } from 'contexts/Web3Context';
import Image from 'next/image';

interface Props {
  user?: string;
  network?: string;
  jazzicon?: boolean;
  handleLogout: () => void;
  color?: 'purple' | 'info';
}

const networkLabel = (network?: string): string => {
  if (network === 'matic') return 'polygon';
  if (network === 'robinhood') return 'Robinhood';
  if (network === 'bitcoin') return 'Bitcoin';
  return network || '';
};

export const Web3Button = ({ user, network, jazzicon, handleLogout, color = 'purple' }: Props): JSX.Element => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [btcAddress, setBtcAddress] = useState<string | null>(() => getStoredBtcAddress());
  const { click } = useAavegotchiSound();
  const walletCtx = useUserWalletDataContext();
  const [, web3Dispatch] = useWeb3();
  const isRobinhood = network === 'robinhood';
  const isBase = network === 'base';
  const isBitcoin = network === 'bitcoin';
  const btcConnected = Boolean(btcAddress);
  // Hide "Connect BTC Wallet" when already linked; keep "Switch to BTC" on other networks.
  const showBtcAction = !isBitcoin || !btcConnected;
  const showSwitchToBase = network !== 'base';
  const showSwitchToRh = network !== 'robinhood';
  const displayUser = displayAddressForNetwork(network, user);

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

  const handleClick = () => {
    click();
    setDropdownOpen((prevState) => !prevState);
  };

  const logout = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleLogout();
  };

  const switchToBase = async (e: React.MouseEvent) => {
    e.stopPropagation();
    click();
    walletCtx?.handleNetworkChange?.(ChainId.base);
    await addBase();
    web3Dispatch({ type: 'UPDATE_CURRENT_NETWORK', currentNetwork: 'base' });
    setDropdownOpen(false);
  };

  const switchToRh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    click();
    walletCtx?.handleNetworkChange?.(ChainId.robinhood);
    await addRobinhood();
    web3Dispatch({ type: 'UPDATE_CURRENT_NETWORK', currentNetwork: 'robinhood' });
    setDropdownOpen(false);
  };

  const switchToBtc = async (e: React.MouseEvent) => {
    e.stopPropagation();
    click();
    // Soft track only — do not EIP-1193 switch / re-activate connector on a fake chain.
    await addBitcoin();
    web3Dispatch({ type: 'UPDATE_CURRENT_NETWORK', currentNetwork: 'bitcoin' });
    setDropdownOpen(false);
  };

  return (
    <>
      <PanelButton color={color} onClick={handleClick}>
        <div className="inner">
          {jazzicon && (
            <div className="jazzicon">
              <Jazzicon diameter={36} seed={jsNumberForAddress(user || '')} />
            </div>
          )}
          <div>
            <p className="user-address body">{smartTrim(displayUser, 8)}</p>
            <p className={`network body-sm ${color}`}>
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
          </div>
          {dropdownOpen && (
            <div className={`dropdown ${color}`}>
              {showBtcAction && (
                <div className="dropdown-item" onClick={switchToBtc}>
                  <p>{isBitcoin ? 'Connect BTC Wallet' : 'Switch to BTC'}</p>
                </div>
              )}
              {showSwitchToRh && (
                <div className="dropdown-item" onClick={switchToRh}>
                  <p>Switch to RH</p>
                </div>
              )}
              {showSwitchToBase && (
                <div className="dropdown-item" onClick={switchToBase}>
                  <p>Switch to Base</p>
                </div>
              )}
              <div className="dropdown-item" onClick={logout}>
                <p>Logout</p>
              </div>
            </div>
          )}
        </div>
      </PanelButton>
      <style jsx>{styles}</style>
    </>
  );
};
