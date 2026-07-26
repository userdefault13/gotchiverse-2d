import styles from './styles';
import { BaseIcon, RhIcon } from 'assets';
import { IndentedPanel } from 'components/UI/component/panels';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { addBase, addRobinhood, smartTrim } from 'helpers/ethers.helper';
import { NetworkNames } from 'types';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useUserWalletDataContext } from 'components/utility/WalletConnect';
import { ChainId } from 'components/utility/WalletConnect/data-provider/chains';
import Image from 'next/image';

interface Props {
  address: string;
  network: NetworkNames;
  onClick?: () => void;
}

const networkLabel = (network: NetworkNames): string => {
  if (network === 'matic') return 'polygon';
  if (network === 'robinhood') return 'Robinhood';
  return network;
};

export const WalletToggle = ({ address, network, onClick }: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const walletCtx = useUserWalletDataContext();
  const isRobinhood = network === 'robinhood';
  const isBase = network === 'base';
  const showSwitchToBase = network !== 'base';
  const showSwitchToRh = network === 'base';

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
  };

  const handleSwitchToRh = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    click();
    walletCtx?.handleNetworkChange?.(ChainId.robinhood);
    await addRobinhood();
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
              <p className="address">{smartTrim(address, 6)}</p>
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
                {networkLabel(network)}
              </p>
              {showSwitchToBase && (
                <button type="button" className="switch-network" onClick={handleSwitchToBase} onMouseDown={(e) => e.stopPropagation()}>
                  Switch to Base
                </button>
              )}
              {showSwitchToRh && (
                <button type="button" className="switch-network" onClick={handleSwitchToRh} onMouseDown={(e) => e.stopPropagation()}>
                  Switch to RH
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
