import Image from 'next/image';
import { Button, ToggleIcon } from 'components/UI/elements';
import styles from './styles';
import { useGame } from 'contexts/GameContext';
import { useEffect, useRef } from 'react';
import { Banner } from 'assets';
import { gotchiverseLinks } from 'data/links';
import { getStaticAssetPrefix } from 'helpers/realm.helper';
import GameController from 'components/controllers/GameController';
import { ToggleAccordionIcon } from 'components/UI/elements/svgs/toggleAccordionIcon';

interface Props {
  isShort: boolean;
  setIsShort: (isShort: boolean) => void;
}
export const VideoBanner = ({ isShort, setIsShort }: Props): JSX.Element => {
  const [{ activeCount }] = useGame();
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef || !videoRef.current) return;
    if (!isShort) videoRef?.current?.play();
    else videoRef.current.pause();
  }, [isShort, videoRef]);

  const onToggleClose = (e) => {
    setIsShort(!isShort);
  };

  return (
    <>
      <div className={`banner-container clickable ${isShort ? 'short' : ''}`}>
        <div className="version-container">{`REALM v${GameController.version} | ${activeCount} player${activeCount !== 1 ? 's' : ''} online`}</div>
        <div className="close-toggle-container">
          <button className="close-toggle" onClick={onToggleClose}>
            <ToggleAccordionIcon active={isShort} direction="down" size={5} stroke="var(--col-black)" />
          </button>
        </div>
        <div className="banner-video-wrapper absolute">
          <Image alt="" src={Banner} layout="fill" objectFit="cover" />
          {!isShort && <video ref={videoRef} muted autoPlay loop src={`${getStaticAssetPrefix()}videos/banner.mp4`} className="video-player"></video>}
        </div>
        <div className="banner-contents">
          <div className="main-title-wrapper">
            <h1 className="main-title">enter the</h1>
            <h2 className="main-subtitle">gotchiverse</h2>
          </div>
          <div className="button-list grid grid-cols-1 md:grid-cols-2 gap-5">
            <Button size={3.6} fullWidth onClick={() => setIsShort(true)}>
              PLAY NOW!
            </Button>
            <Button size={3.6} fullWidth color="info" onClick={() => window.open(gotchiverseLinks.aavegotchi.marketplace, 'blank')}>
              GET AN AAVEGOTCHI
            </Button>
          </div>
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
