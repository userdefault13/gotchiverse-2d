import Image from 'next/image';
import { HalloweenBack, MainBackground, SpiderWeb } from 'assets';
import { NotificationStack } from './hud/components';
import { useGame } from 'contexts/GameContext';

interface Props {
  children: React.ReactNode;
  blur?: boolean;
  scene: 'connected' | 'unconnected' | undefined;
}

const Layout = ({ children, blur, scene }: Props) => {
  const [{ gameConfig }] = useGame();
  const isHalloween = gameConfig.gotchiverseTheme === 'halloween';
  return (
    <>
      <NotificationStack />
      <div className={`bg-container ${scene}`}>
        <span className="bg-img">
          <Image alt="" src={MainBackground} fill sizes="100vw" style={{ objectFit: 'cover' }} />
        </span>
        {isHalloween && <div className={`darken ${scene === 'connected' ? scene : ''}`}></div>}
        {isHalloween && scene === 'unconnected' && (
          <span className="bg-halloween">
            <Image alt="" src={HalloweenBack} layout="fill" />
          </span>
        )}
        <div className="bg-overlay">
          {children}
          {isHalloween && scene === 'connected' && (
            <span className="bg-halloween">
              <Image alt="" src={SpiderWeb} layout="fill" />
            </span>
          )}
        </div>
      </div>
      <style jsx>{`
        .bg-container {
          width: 100%;
          height: 100vh;
          position: relative;
        }
        .bg-container.connected {
          height: calc(100vh - 10rem);
        }
        .bg-overlay,
        .bg-img,
        .bg-halloween,
        .darken {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
        }

        .bg-halloween {
          pointer-events: none;
        }

        .bg-img {
          object-fit: cover;
          object-position: center;
        }
        .bg-overlay {
          content: '';
          background-color: rgba(16, 2, 33, 0.37);
          backdrop-filter: ${blur ? 'blur(1px)' : 'none'};
          overflow: hidden;
        }
        .darken {
          background: linear-gradient(90deg, #000000 -1.07%, rgba(0, 0, 0, 0.5) 33.67%, rgba(0, 0, 0, 0.5) 68.94%, #000000 100%);
          opacity: 0.4;
        }
        .darken.connected {
          background: linear-gradient(90deg, #000000 0%, #000000 19.27%, rgba(0, 0, 0, 0) 48.96%, #000000 82.81%, #000000 100%);
          opacity: 0.8;
        }
      `}</style>
    </>
  );
};

export default Layout;
