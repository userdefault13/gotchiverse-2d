/* eslint-disable multiline-ternary */
import { AavegotchiDefeated, HeartIcon, HpPotion, KekIcon, KekIconSm, PotionBigHP, PotionBigInactive, WarningIcon } from 'assets';
import GlobalState from 'contexts/GlobalState';
import { MAP_CONFIG_BY_ID } from 'shared_code/constants/const.game';
import GameController from 'components/controllers/GameController';
import { Button, CheckIcon } from 'components/UI/elements';
import { useUI } from 'contexts/UIContexts';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from './styles';
import { getQueueSize } from 'helpers/api.helpers';
import { Modal } from 'components/UI/component';
import { useRealm } from 'contexts/RealmContext';
import { isTrueSpectator } from 'helpers/gotchi.helper';
import { Leaderboard } from 'components/UI/hud/components/Leaderboard';
import { performLogOut } from 'helpers/logout.helper';
import { formatTimeLeft } from 'helpers/parcels.helper';
import { getOnChainAlchemicaIcon } from 'helpers/functions';
import _ from 'lodash';

export const ExitArenaModal = (): JSX.Element => {
  const [{ selectedPlayer, escrow, playerWallet }] = useRealm();
  const [{ exitArenaModal }] = useUI();
  const [, uiDispatch] = useUI();
  const { back } = useAavegotchiSound();

  const [canExit, setCanExit] = useState(false);
  const [exitStatus, setExitStatus] = useState({});
  const [queue, setQueue] = useState<{ aarena: string; citaadel: string }>();
  const [disableRespawn, setDisableRespawn] = useState(false);
  const [respawnDelay, setRespawnDelay] = useState(0);
  const [winningConditions, setWinningConditions] = useState([]);
  const [respawnCost, setRespawnCost] = useState<Record<string, number>>(
    MAP_CONFIG_BY_ID[GameController.MAP].RESPAWN_BUYBACK_TOKEN_COST as Record<string, number>,
  );
  const [canBuyBack, setCanBuyBack] = useState<boolean>(true);

  useEffect(() => {
    if (exitArenaModal.open && isTrueSpectator(selectedPlayer.isSpectator)) return onQuit();
    if (exitArenaModal.open && exitArenaModal.isDead) void fetchAndUpdate();
    if (!exitArenaModal.open || exitArenaModal.isDead) return;
    if (exitArenaModal.exitData) {
      setCanExit(exitArenaModal.exitData.canLeaveAndKeepWinnings);
      setExitStatus(exitArenaModal.exitData.status);
      return;
    }

    const winningConditions = [];
    const { keepWinningsReqs } = GlobalState.GAME.state.gameConfig;

    if (keepWinningsReqs.numKills) {
      winningConditions.push({ condition: `Defeat at least ${keepWinningsReqs.numKills} gotchi`, key: 'numKills' });
    }

    if (keepWinningsReqs.sessionDuration) {
      const minutes = Math.floor(keepWinningsReqs.sessionDuration / 60);
      winningConditions.push({ condition: `Survive for at least ${minutes} minutes`, key: 'sessionDurationSec' });
    }

    if (keepWinningsReqs.noHitsReceivedDuration) {
      winningConditions.push({
        condition: `Avoid being hit for the last ${keepWinningsReqs.noHitsReceivedDuration} seconds`,
        key: 'noHitsReceivedDurationSec',
      });
    }

    if (keepWinningsReqs.numHits) {
      winningConditions.push({ condition: `Hit at least ${keepWinningsReqs.numHits} gotchi`, key: 'numHits' });
    }

    setWinningConditions(winningConditions);

    GameController.sendData('game-actions', 'combat-exit', null);
  }, [exitArenaModal]);

  useEffect(() => {
    let buyBack = true;
    _.each(respawnCost, (value, key) => {
      if (playerWallet[key.toLocaleLowerCase()] < value) buyBack = false;
    });
    setCanBuyBack(buyBack);
  }, [playerWallet]);

  useEffect(() => {
    setDisableRespawn(exitArenaModal.respawnDelay > 0);
    const intervalID = setInterval(() => {
      if (exitArenaModal.deathTime) {
        const spawnTime = exitArenaModal.deathTime + exitArenaModal.respawnDelay * 1000;
        const now = Date.now();
        const secondsUntilSpawnTime = Math.ceil((spawnTime - now) / 1000);

        if (secondsUntilSpawnTime > 0) {
          setRespawnDelay(secondsUntilSpawnTime);
          setDisableRespawn(true);
        } else {
          setRespawnDelay(0);
          setDisableRespawn(false);
        }
      }
    }, 1000);
    return () => clearInterval(intervalID);
  }, [exitArenaModal]);

  const fetchAndUpdate = async () => {
    const queue = await getQueueSize();
    setQueue(queue);
  };

  const handleClose = () => {
    uiDispatch({
      type: 'UPDATE_EXIT_ARENA_MODAL',
      exitArenaModal: {
        open: false,
        isDead: false,
      },
    });
  };

  const onQuit = () => {
    back();
    handleClose();
    performLogOut();
  };

  // todo: Check RESPAWN_DELAY here, have the button count down and become enabled when able to respawn
  const onRejoin = () => {
    // fetch Queue and
    // console.log('queue', queue);
    if (!queue || Number(queue.aarena) !== 0) {
      location.reload();
      return;
    }
    GameController.sendData('game-actions', 'spawn-player', null);
    // Players.setDeathState(Players.selectedPlayer.id, false);
    // handleClose();
  };

  // const deathInfo = `${exitArenaModal.damageType} by gotchi #${exitArenaModal.attackerId}`;

  return (
    <>
      <Modal
        secondaryColor
        color="purple-400"
        title={exitArenaModal.isDead ? 'Rekt!' : 'Exit Aarena?'}
        open={exitArenaModal.open}
        onClose={exitArenaModal.isDead ? onRejoin : handleClose}
        hideClose={exitArenaModal.isDead}
        leftPanel={GameController.MAP === 'aarena' ? <Leaderboard layout="exit" excludePlayer limit={5} /> : null}
      >
        <div className="content">
          {!exitArenaModal.isDead && <p className="exit-aarena">To escape the Aarena with your winnings, you must:</p>}
          <div className="announcement">
            {exitArenaModal.isDead ? (
              <div className="defeated">
                <div className="info-text-white">{`Your were defeated ${exitArenaModal.attackerId || exitArenaModal.damageType ? 'by' : '!'}`}</div>
                <p className="warning-text">{exitArenaModal.attackerName || exitArenaModal.attackerId || exitArenaModal.damageType}</p>
                <div className="gotchi-mascot">
                  <Image alt="" src={AavegotchiDefeated} layout="fill" />
                </div>
              </div>
            ) : (
              <div className="winning-conditions">
                <div className="conditions">
                  {winningConditions.map(({ condition, key }, index) => (
                    <div key={index} className={`condition ${exitStatus[key]?.criteriaMet ? 'met' : ''}`}>
                      <CheckIcon
                        fill={exitStatus[key]?.criteriaMet ? 'var(--col-info-800)' : 'var(--col-grey-200)'}
                        size={18}
                        checked={exitStatus[key]?.criteriaMet}
                      />
                      {condition}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {!exitArenaModal.isDead && (
            <div className="message-container">
              {canExit && (
                <p className="success-text">
                  CONGRATULATIONS, <br />
                  YOU MAY EXIT WITH YOUR WINNINGS!
                </p>
              )}
              {!canExit && (
                <>
                  <div className="warning-icon">
                    <Image alt="" src={WarningIcon} layout="fill" />
                  </div>
                  <p className="warning-text">
                    YOU HAVE NOT MET THE REQUIREMENTS
                    <br />
                    Leaving now will forfeit your winnings!
                  </p>
                </>
              )}
            </div>
          )}
          {exitArenaModal.isDead && (
            <div className={`play-again flex ${!respawnDelay ? 'center' : ''}`}>
              <div className="icon-wrapper">
                <Image alt="" src={HeartIcon} width={15} height={15} />
              </div>
              <span className="pink">HP Recovery:</span>

              {respawnDelay ? formatTimeLeft(respawnDelay, true) : '100%'}
            </div>
          )}
          <div className="buttons-container">
            {!exitArenaModal.isDead && (
              <>
                <div className="expandable">
                  <Button fullWidth onClick={onQuit} size={3}>
                    Let me out!
                  </Button>
                </div>
                <div className="expandable">
                  <Button fullWidth onClick={exitArenaModal.isDead ? onRejoin : handleClose} disabled={disableRespawn} color="info" size={3}>
                    {exitArenaModal.isDead ? 'Rejoin' : 'Keep Playing'}
                    {exitArenaModal.isDead && respawnDelay ? <span>({respawnDelay})</span> : null}
                  </Button>
                </div>
              </>
            )}
          </div>
          {exitArenaModal.isDead && (
            <>
              {respawnDelay && !canBuyBack ? <p className="pink">Please top up your Player Wallet!</p> : null}
              <div className="cta-wrapper flex">
                <Button buildMode onClick={onRejoin} disabled={disableRespawn} color="info">
                  {respawnDelay ? 'Recover & Rejoin' : 'Rejoin'}
                </Button>
                {!!respawnDelay && (
                  <Button
                    buildMode
                    onClick={() => GameController.sendData('game-actions', 'attempt-respawn-buyback')}
                    disabled={!canBuyBack}
                    color="pink"
                  >
                    <span>Rejoin Now</span>

                    <div className="cost-wrapper">
                      {_.map(respawnCost, (value, token) => (
                        <div className="item-price-container" key={token}>
                          <div className="item-price-alchemica">
                            <Image alt="" src={getOnChainAlchemicaIcon(token, true)} width={15} />
                          </div>
                          <div className={`item-price ${String(token).toLowerCase()}`}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
      <style jsx>{styles}</style>
    </>
  );
};
