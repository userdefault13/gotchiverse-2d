/* eslint-disable @typescript-eslint/prefer-ts-expect-error */
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

import Performance from './performance';
import { useWeb3 } from 'contexts/Web3Context';
import { usePhaser } from 'contexts/PhaserContext';
import GameController from 'components/controllers/GameController';

const IonPhaser = dynamic(async () => await import('@ion-phaser/react').then((mod) => mod.IonPhaser), { ssr: false });
const IonPhaserComponent = IonPhaser as React.ComponentType<any>;
interface PhaserGameLoaderProps {
  gameScene;
}

const PhaserGameLoader = (props: PhaserGameLoaderProps) => {
  const { gameScene } = props;
  const [{ currentAccount }, web3Dispatch] = useWeb3();
  const [{ performance }, phaserDispatch] = usePhaser();
  const [phaser, setPhaser] = useState(undefined);
  const [gameConfig, setGameConfig] = useState(undefined);
  const [height, setHeight] = useState<string>();
  const [top, setTop] = useState<string>();

  useEffect(() => {
    // We need to load Phaser with require instead of import to prevent "Navigator is not defined" issues related to SSR
    // It should only load once, so we use useEffect
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Phaser = require('phaser');
    setPhaser(Phaser);
    // Keep the Phaser canvas below the fixed GameNav so HUD controls stay clickable.
    setHeight('calc(100vh - 5rem)');
    setTop('5rem');
  }, []);

  useEffect(() => {
    // MetaMask / browser side panels change layout without a reliable window resize on some builds.
    const refreshScale = () => {
      try {
        const game = (window as unknown as { game?: { scale?: { refresh?: () => void } } }).game;
        game?.scale?.refresh?.();
      } catch {
        /* ignore */
      }
      try {
        // IonPhaser may stash the instance on the parent
        const parent = document.getElementById('pahserGameLoader');
        const canvas = parent?.querySelector('canvas');
        if (canvas) {
          window.dispatchEvent(new Event('resize'));
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('resize', refreshScale);
    window.visualViewport?.addEventListener('resize', refreshScale);
    return () => {
      window.removeEventListener('resize', refreshScale);
      window.visualViewport?.removeEventListener('resize', refreshScale);
    };
  }, []);

  useEffect(() => {
    // init debug console
    Performance.init(phaserDispatch);
    // Wait until the account and gameScene are set to update the gameConfig because that trigger the initial rendering.
    if (currentAccount && gameScene && !gameConfig) {
      const config = {
        initialize: true,
        title: 'Realm',
        game: {
          type: phaser ? phaser.AUTO : undefined,

          // true is much better for 1:1 zoom or closer for sharp looking gotchis and world lines but is not change-able at runtime and most play zoomed out
          pixelArt: false,
          roundPixels: true,
          fps: {
            forceSetTimeOut: true,
            target: 30,
          },
          scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          parent: 'pahserGameLoader',
          backgroundColor: '#150628',
          disableContextMenu: true,
          scene: {
            preload: gameScene.preload,
            create: gameScene.create,
            init: gameScene.init,
            update: gameScene.update,
            physics: {
              default: false, // The default physics system to start for each scene. 'arcade', 'impact' or 'matter' we choose false no physics on front-end
            },
          },
        },
      };
      setGameConfig(config);
    }
  }, [gameScene]);

  // Wait until everything has loaded to load the initial scene
  if (gameConfig) {
    return (
      <div
        id="pahserGameLoader"
        className="fixed"
        style={{ height, top, left: 0, right: 0, width: '100%', zIndex: 0 }}
      >
        <IonPhaserComponent
          // @ts-ignore */
          game={gameConfig.game}
          initialize={true}
        />
      </div>
    );
  }

  return <div>Loading assets...</div>;
};
export default PhaserGameLoader;
