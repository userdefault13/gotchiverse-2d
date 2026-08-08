import Layout from 'components/UI/Layout';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { Button, WalletConnectButton } from 'components/UI/elements';
import { useWeb3 } from 'contexts/Web3Context';
import { useUserWalletDataContext } from 'components/utility/WalletConnect';
import Image from 'next/image';
import { addBase, addBitcoin, addRobinhood } from 'helpers/ethers.helper';
import styles from './styles';
import { GotchiverseLogo, GotchiverseTitleHalloween } from 'assets';
import GameController from 'components/controllers/GameController';
import { useGame } from 'contexts/GameContext';
import { ChainId } from 'components/utility/WalletConnect/data-provider/chains';
import { isRealmAllowedNetwork } from 'web3/web3';

const EXPECTED_NETWORK = process.env.REALM_NETWORK || process.env.NETWORK || 'base';

export const UnconnectedScreen = (): JSX.Element => {
  const { showSelectWalletModal, handleNetworkChange, walletModalVisible } = useUserWalletDataContext();
  const { click } = useAavegotchiSound();
  const [{ gameConfig }] = useGame();
  const isHalloween = gameConfig.gotchiverseTheme === 'halloween';

  const [{ currentNetwork, currentAccount }, web3Dispatch] = useWeb3();

  const checkUser = async () => {
    click();
    showSelectWalletModal(true);
  };

  const connectToBase = async () => {
    handleNetworkChange(ChainId.base);
    void addBase();
  };

  const connectToRobinhood = async () => {
    handleNetworkChange(ChainId.robinhood);
    void addRobinhood();
  };

  const connectToBitcoin = async () => {
    await addBitcoin();
    web3Dispatch({ type: 'UPDATE_CURRENT_NETWORK', currentNetwork: 'bitcoin' });
  };

  const onExpectedNetwork = isRealmAllowedNetwork(currentNetwork);

  return (
    <>
      <Layout scene="unconnected">
        <div className="container mx-auto">
          <div className="main">
            <div className="title-container">
              {!walletModalVisible && (
                <>
                  <Image alt="" src={isHalloween ? GotchiverseTitleHalloween : GotchiverseLogo} className="title" />
                  {!isHalloween && <h2 className="version">REALM v{GameController.version}</h2>}
                  {isHalloween && <h2 className="halloween">HALLOWEEN WEEK</h2>}
                  {!currentAccount && !isHalloween && <WalletConnectButton onClick={checkUser} />}
                  {!currentAccount && isHalloween && (
                    <div className="button-container halloween">
                      <Button size={4.8} onClick={checkUser} halloweenMode={true} color={gameConfig.gotchiverseTheme}>
                        CONNECT WALLET
                      </Button>
                    </div>
                  )}
                  {currentAccount && !onExpectedNetwork && (
                    <div className="connect-to-base" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <Button size={3.2} onClick={connectToBase} color={gameConfig.gotchiverseTheme} secondary fullWidth>
                        Connect to Base
                      </Button>
                      {EXPECTED_NETWORK === 'base' && (
                        <>
                          <Button
                            size={3.2}
                            onClick={connectToRobinhood}
                            color={gameConfig.gotchiverseTheme}
                            secondary
                            fullWidth
                          >
                            Connect to Robinhood Chain
                          </Button>
                          <Button
                            size={3.2}
                            onClick={connectToBitcoin}
                            color={gameConfig.gotchiverseTheme}
                            secondary
                            fullWidth
                          >
                            Connect to Bitcoin
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </Layout>
      <style jsx>{styles}</style>
    </>
  );
};
