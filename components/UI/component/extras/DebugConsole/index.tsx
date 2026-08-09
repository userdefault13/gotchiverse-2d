import { scene } from 'components/controllers/SceneController';
import styles from './styles';
import { usePhaser } from 'contexts/PhaserContext';
import { getMapPos } from 'helpers/phaser.helper';
import GameController from 'components/controllers/GameController';

export const DebugConsole = (): JSX.Element => {
  const _performance = () => {
    return (
      <span key="ping" style={{ marginRight: 10, lineHeight: 1 }}>
        Ping: {performance?.ping ?? 0}ms | Positions: {performance?.ping ?? 0}ms
      </span>
    );
    /* if we have more than 2 channels we could switch back to this
    const channels = Object.keys(performance || {});
    return channels.map((channel, key) => {
      return (
        // eslint-disable-next-line react/jsx-key
        <span key={key} style={{ marginRight: 10, lineHeight: 1 }}>
          {channel.charAt(0).toUpperCase() + channel.slice(1)}: {performance[channel]}ms
        </span>
      );
    });
    */
  };
  const [{ host, playersOnline, queues, performance, toggleDebugConsole, playerPosition, mapAlchemica }, phaserDispatch] = usePhaser();
  const fpsTarget = scene?.game?.loop?.targetFps;
  const fpsActual = scene?.game?.loop?.actualFps;
  return (
    <>
      {toggleDebugConsole && (
        <p className="performance">
          REALM v{GameController.version} DEBUG CONSOLE:
          {host && <span>Server: {host} </span>}
          {playerPosition && <span> Position: {getMapPos()}</span>}
          {_performance()}
          {playersOnline && <span> Players: {playersOnline} </span>}
          {queues && <span> Queues: {queues} </span>}
          {<span> Alchemica: {mapAlchemica} </span>}
          {fpsTarget != null && (
            <span>
              FPS: Target {fpsTarget} | Actual {fpsActual != null ? Number(fpsActual).toFixed(2) : '—'}
            </span>
          )}
        </p>
      )}

      <style jsx>{styles}</style>
    </>
  );
};
