import { BaseIcon, RhIcon } from 'assets';
import { addBase, addRobinhood, smartTrim } from 'helpers/ethers.helper';
import React, { useState } from 'react';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import styles from './styles';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { PanelButton } from 'components/UI/elements';
import { useUserWalletDataContext } from 'components/utility/WalletConnect';
import { ChainId } from 'components/utility/WalletConnect/data-provider/chains';
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
  return network || '';
};

export const Web3Button = ({ user, network, jazzicon, handleLogout, color = 'purple' }: Props): JSX.Element => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { click } = useAavegotchiSound();
  const walletCtx = useUserWalletDataContext();
  const isRobinhood = network === 'robinhood';
  const isBase = network === 'base';
  const showSwitchToBase = network !== 'base';
  const showSwitchToRh = network === 'base';

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
    setDropdownOpen(false);
  };

  const switchToRh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    click();
    walletCtx?.handleNetworkChange?.(ChainId.robinhood);
    await addRobinhood();
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
            <p className="user-address body">{smartTrim(user, 8)}</p>
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
              {networkLabel(network)}
            </p>
          </div>
          {dropdownOpen && (
            <div className={`dropdown ${color}`}>
              {showSwitchToBase && (
                <div className="dropdown-item" onClick={switchToBase}>
                  <p>Switch to Base</p>
                </div>
              )}
              {showSwitchToRh && (
                <div className="dropdown-item" onClick={switchToRh}>
                  <p>Switch to RH</p>
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
