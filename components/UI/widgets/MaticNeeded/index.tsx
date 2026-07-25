import { PolygonIcon } from 'assets';
import { TopNotification } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { useUser } from 'contexts/UserContext';
import { fetchAndSetMaticBalance } from 'contexts/UserContext/actions';
import { useWeb3 } from 'contexts/Web3Context';
import Image from 'next/image';
import { useEffect } from 'react';
import styles from './styles';

/** Polygon MATIC is cheap; Base ETH gas needs only a tiny float. */
const MIN_GAS_BALANCE: Record<string, number> = {
  base: 0.00005,
  matic: 0.1,
  mumbai: 0.1,
};

export const MaticNeeded = (): JSX.Element => {
  const [{ maticBalance }, userDispatch] = useUser();
  const [{ currentAccount, globalProvider, currentNetwork }] = useWeb3();

  useEffect(() => {
    if (currentAccount && globalProvider && currentNetwork) {
      const web3Options = { provider: globalProvider, account: currentAccount, network: currentNetwork };
      void fetchAndSetMaticBalance(web3Options, userDispatch);
    }
  }, [currentAccount, globalProvider, currentNetwork, userDispatch]);

  const isBase = currentNetwork === 'base';
  const minBalance = MIN_GAS_BALANCE[currentNetwork || ''] ?? 0.1;
  const hasBalance = maticBalance !== undefined ? maticBalance >= minBalance : true;

  // Polygon-era gas banner is irrelevant on Base unless ETH is critically low.
  if (isBase && hasBalance) {
    return <></>;
  }

  const title = isBase ? "You're out of ETH!" : "You're out of MATIC!";
  const swapHref = isBase ? 'https://bridge.base.org/' : 'https://wallet.polygon.technology/gas-swap/';
  const buttonLabel = isBase ? 'Bridge ETH to Base' : 'Swap for Gas Token';

  return (
    <>
      <div className={`notification-container ${!hasBalance ? 'visible' : ''}`}>
        <TopNotification>
          <div className="inner">
            {!isBase && <Image alt="" src={PolygonIcon} width={54} height={54} />}
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
