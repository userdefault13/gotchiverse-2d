import { useEffect } from 'react';
import { useWeb3 } from 'contexts/Web3Context';
import { usePhaser } from 'contexts/PhaserContext';
import { UnconnectedScreen } from 'components/UI/screens/section';
import SFXController from 'components/controllers/SFXController';
import { LandingScreen } from 'components/UI/screens/section/LandingScreen';
import { isRealmAllowedNetwork } from 'web3/web3';

const IndexPage = () => {
  const [{ currentAccount, currentNetwork, web3Loading }] = useWeb3();
  const [{ scene }, phaserDispatch] = usePhaser();

  useEffect(() => {
    if (scene?.sys?.game) {
      SFXController.musicStop();
      scene.sys.game.destroy(true);
      const allCanvases = document.getElementsByTagName('canvas');
      if (allCanvases?.length) allCanvases[0].remove();
      phaserDispatch({
        type: 'UPDATE_SCENE',
        scene: undefined,
      });
      phaserDispatch({
        type: 'UPDATE_GAME_SHOOTING',
        gameShooting: false,
      });
      phaserDispatch({
        type: 'UPDATE_CONNECTED',
        connected: false,
      });
    }
  }, []);

  useEffect(() => {
    // @ts-expect-error
    if (window.ethereum) {
      // @ts-expect-error
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  const onExpectedNetwork = isRealmAllowedNetwork(currentNetwork);

  return (
    <>
      {currentAccount && !web3Loading && onExpectedNetwork && <LandingScreen />}

      {(!currentAccount || web3Loading || !onExpectedNetwork) && <UnconnectedScreen />}
    </>
  );
};

export default IndexPage;
