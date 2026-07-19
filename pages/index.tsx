import { useEffect } from 'react';
import { useWeb3 } from 'contexts/Web3Context';
import { usePhaser } from 'contexts/PhaserContext';
import { UnconnectedScreen } from 'components/UI/screens/section';
import SFXController from 'components/controllers/SFXController';
import { LandingScreen } from 'components/UI/screens/section/LandingScreen';

const IndexPage = () => {
  const [{ currentAccount, currentNetwork, web3Loading }, web3Dispatch] = useWeb3();
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
      // reset gameShooting icon
      phaserDispatch({
        type: 'UPDATE_GAME_SHOOTING',
        gameShooting: false,
      });
      phaserDispatch({
        type: 'UPDATE_CONNECTED',
        connected: false,
      });
      // console.log('Scene was destroyed!');
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

  const expectedNetwork = process.env.REALM_NETWORK || process.env.NETWORK || 'base';
  const onExpectedNetwork = currentNetwork === expectedNetwork || (['local', 'alpha', 'development'].includes(process.env.APP_ENV || '') && currentNetwork === 'localhost');

  return (
    <>
      {/* <NotificationBar /> */}
      {currentAccount && !web3Loading && onExpectedNetwork && <LandingScreen />}

      {(!currentAccount || web3Loading || !onExpectedNetwork) && <UnconnectedScreen />}
    </>
  );
};

export default IndexPage;
