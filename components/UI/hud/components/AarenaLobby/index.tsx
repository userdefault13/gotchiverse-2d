import { AavegotchiMascot } from 'assets';
import InputController from 'components/controllers/inputController';
import GameController from 'components/controllers/GameController';
import { Button } from 'components/UI/elements';
import { useRealm } from 'contexts/RealmContext';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from './styles';
import { useUI } from 'contexts/UIContexts';
import { isColyseusNetcode } from 'helpers/colyseus.client';

export const AarenaLobby = (): JSX.Element => {
  const winningConditions = ['Defeat at least 1 gotchi', 'Survive for at least 3 minutes'];
  const [isFull, setFull] = useState(true);
  const [{ aarenaQueue }, realmDispatch] = useRealm();
  const [, uiDispatch] = useUI();

  useEffect(() => {
    if (aarenaQueue.state) {
      InputController.updateDisableKeyboard(true);
      InputController.toggleMouseMovement(false);
    } else {
      InputController.updateDisableKeyboard(false);
      InputController.toggleMouseMovement(true);
    }
  }, [aarenaQueue]);

  useEffect(() => {
    if (!aarenaQueue?.state) return;
    setFull(aarenaQueue.status === 'queued');
  }, [aarenaQueue]);

  const closeLobby = () => {
    // Colyseus MVP: player is already spawned on join — just dismiss the lobby.
    if (!isColyseusNetcode()) {
      GameController.sendData('game-actions', 'spawn-player', null);
    }
    realmDispatch({
      type: 'UPDATE_AARENA_QUEUE',
      aarenaQueue: { state: false },
    });
  };

  return (
    <>
      {aarenaQueue?.state && (
        <div className="lobby-overlay">
          <div className={`aarena-lobby  ${isFull ? '' : 'empty'}`}>
            <div className="aarena-queue">
              <div className="aarena-queue-outline" />
              <div className="content">
                <div className="welcome">
                  <div className="small">Welcome</div>
                  <div className="big">to the aarena!</div>
                </div>
                <div className="aarena-info">
                  {isFull
                    ? (
                    <>
                      <div className="message">The Aarena is currently full!</div>
                      <div className="gotchi-count-info">
                        <div className="gotchi-image">
                          <Image alt="" src={AavegotchiMascot} />
                        </div>
                        {aarenaQueue?.meta?.position && (
                          <div className="count-wrapper">
                            <div className="gotchi-count">
                              There are <span className="count">{aarenaQueue.meta.position}</span> gotchis ahead of you
                            </div>
                            <div className="msg-join">You will automatically join once a spot opens!</div>
                          </div>
                        )}
                      </div>
                    </>
                      )
                    : (
                    <div className="message">The Aarena is currently empty.</div>
                      )}
                </div>
              </div>
            </div>
            <div className="rules-header">
              <div className="line"></div>
              <span>Aarena Rules</span>
              <div className="line"></div>
            </div>
            <div className="aarena-rules">
              <div className="aarena-rules-outline" />
              <div className="content">
                <div className="condition-header">To EXIT the Aarena with your winnings you must:</div>
                <ul className="condition-list">
                  {winningConditions.map((label, index) => (
                    <li key={index}>{label}</li>
                  ))}
                </ul>
                <div className="exit-warning">
                  EXITING WITHOUT MEETING THESE CRITERIA
                  <br /> WILL FORFEIT ALL YOUR WINNINGS!
                </div>
                {!isFull && (
                  <div className="cta-container">
                    <Button size={3.1} color="info" onClick={closeLobby}>
                      ENTER NOW!
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{styles}</style>
    </>
  );
};
