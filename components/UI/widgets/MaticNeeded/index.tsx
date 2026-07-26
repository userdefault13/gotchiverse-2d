import { BaseIcon, PolygonIcon, RhIcon } from 'assets';
import { TopNotification } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { useUser } from 'contexts/UserContext';
import { fetchAndSetMaticBalance } from 'contexts/UserContext/actions';
import { useWeb3 } from 'contexts/Web3Context';
import Image from 'next/image';
import { useEffect } from 'react';
import styles from './styles';

/** Polygon MATIC is cheap; Base / RH ETH gas needs only a tiny float. */
const MIN_GAS_BALANCE: Record<string, number> = {
  base: 0.00005,
  robinhood: 0.00005,
  matic: 0.1,
  mumbai: 0.1,
};

const isEthGasNetwork = (network?: string): boolean => network === 'base' || network === 'robinhood';

export const MaticNeeded = (): JSX.Element => {
  const [{ maticBalance }, userDispatch] = useUser();
  const [{ currentAccount, globalProvider, currentNetwork }] = useWeb3();

  useEffect(() => {
    if (currentAccount && globalProvider && currentNetwork) {
      const web3Options = { provider: globalProvider, account: currentAccount, network: currentNetwork };
      void fetchAndSetMaticBalance(web3Options, userDispatch);
    }
  }, [currentAccount, globalProvider, currentNetwork, userDispatch]);

  const usesEthGas = isEthGasNetwork(currentNetwork);
  const isRobinhood = currentNetwork === 'robinhood';
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
  const ethIcon = isRobinhood ? RhIcon : BaseIcon;

  return (
    <>
      <div className={`notification-container ${!hasBalance ? 'visible' : ''}`}>
        <TopNotification>
          <div className="inner">
            {!usesEthGas && <Image alt="" src={PolygonIcon} width={54} height={54} />}
            {usesEthGas && (
              <span className="eth-icon">
                <Image alt="" src={ethIcon} width={40} height={40} />
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
