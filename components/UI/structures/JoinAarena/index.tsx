import { StyledTitle } from 'components/UI/elements';
import Image from 'next/image';
import styles from './styles';
import { Lock, JoinAarenaBG, JoinAarenaBGDenver } from 'assets/images';
import { useGame } from 'contexts/GameContext';
import { useWeb3 } from 'contexts/Web3Context';

interface JoinAarenaProps {
  handleSpawn: (id: string) => void;
}

export const JoinAarena = ({ handleSpawn }: JoinAarenaProps): JSX.Element => {
  const [{ gameConfig, aarenaCount, aarenaRhCount }] = useGame();
  const [{ currentNetwork }] = useWeb3();
  const onlineCount = currentNetwork === 'robinhood' ? aarenaRhCount : aarenaCount;
  const enterAarena = () => {
    if (gameConfig.combatIsLive) handleSpawn('aarena');
  };
  return (
    <>
      <div className="join-aarena">
        <StyledTitle text="The Aarena" style="centered" color="yellow" />
        <div className="out-container" onClick={enterAarena}>
          {gameConfig.combatIsLive && (
            <div className="inside-title-container">
              <div className="inner">
                <span className="content">new battle mode!</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-center combat-inactive">
            <Image src={gameConfig.aarenaTheme === 'denver' ? JoinAarenaBGDenver : JoinAarenaBG} alt="EVENT IMAGE" layout="fill" />
            {gameConfig.combatIsLive && (
              <div className="player-count">{`${onlineCount} player${onlineCount === 1 ? '' : 's'} online`}</div>
            )}
            {!gameConfig.combatIsLive && (
              <>
                <div className="dark-overlay absolute" />
                <div className="lock-icon">
                  <Image alt="" src={Lock} />
                </div>
              </>
            )}
          </div>
        </div>
        <div className="bottom-outline">
          <div className="left"></div>
          <div className="center">
            <div className="diag"></div>
            <button className={`cta-play ${gameConfig.combatIsLive ? '' : 'inactive'}`} type="button" onClick={enterAarena}>
              {gameConfig.combatIsLive ? 'PLAY NOW!' : 'COMING SOON...'}
            </button>
            <div className="bottom-line"></div>
            <div className="anti-diag"></div>
          </div>
          <div className="right"></div>
        </div>
      </div>

      <style jsx>{styles}</style>
    </>
  );
};
