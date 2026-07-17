/* eslint-disable multiline-ternary */
import styles from './styles';
import Image from 'next/image';
import { BorrowedIcon, Inactive } from 'assets';
import { ChannelIcon, CloseIcon, LevelIcon, ParcelImage } from 'components/UI/elements';
import { GotchiverseParcel } from 'types';
import { formatDigit } from 'helpers/functions';
import Truncate from 'components/UI/widgets/Truncate';

interface Props {
  item?: GotchiverseParcel;
  isBorrowed?: boolean;
  mode?: 'narrow' | 'wide';
  secondsUntilChannel?: number;
  altarLevel?: number;
  active?: boolean;
}

const formatTimeLeft = (seconds: number) => {
  if (seconds === 0) return 'Ready';

  const secondsPerHour = 3600;
  const hours = Math.floor(seconds / secondsPerHour);

  const secondsPerMinute = 60;
  const minutes = Math.floor((seconds % secondsPerHour) / secondsPerMinute);

  return `${formatDigit(hours)}h ${formatDigit(minutes)}m`;
};

export const ParcelCard = ({ item, altarLevel, secondsUntilChannel, isBorrowed, mode, active }: Props): JSX.Element => {
  const parcelTokenId = item?.id ?? item?.tokenId;

  return (
    <>
      <div className={`parcel-card ${mode} ${active ? 'active' : ''} ${item && isBorrowed ? 'borrowed' : ''} ${!item ? 'disabled' : ''}`}>
        <div className="flex w-full gap-2">
          <div className={`img-container ${!item ? 'disabled' : ''} ${item && isBorrowed ? 'borrowed' : ''}`}>
            {item ? <ParcelImage parcelId={parcelTokenId} size={9} /> : <CloseIcon size={35} big fill="var(--col-info-400)" opacity={0.5} />}
          </div>
          {item ? (
            <div className="detail-wrapper">
              <div className="parcel-loc-info">
                <div className="name">
                  <Truncate chars={38}>{item.parcelHash}</Truncate>
                  {isBorrowed && (
                    <div className="borrowed-icon">
                      <Image alt="" src={BorrowedIcon} layout="fill" />
                    </div>
                  )}
                </div>
                <div className="district">
                  District {item?.district ?? '-'} <span className="token-id">ID: {parcelTokenId ?? '-'}</span>
                </div>
              </div>

              <div className="info-container">
                {secondsUntilChannel !== null ? (
                  <div className={`channel-icon ${secondsUntilChannel ? '' : 'ready'}`}>
                    <ChannelIcon
                      size={mode === 'narrow' ? '1.8em' : '2.2em'}
                      fill={secondsUntilChannel ? 'var(--col-grey)' : 'var(--col-purple-400)'}
                    />
                    <span className="time-left">{formatTimeLeft(secondsUntilChannel)}</span>
                  </div>
                ) : null}
                {altarLevel ? (
                  <div className={`level-icon ${isBorrowed ? 'borrowed' : ''}`}>
                    <LevelIcon size={mode === 'narrow' ? '1.8em' : '2.2em'} fill={isBorrowed ? 'var(--col-info-400)' : 'var(--col-pink-400)'} />
                    <span className="level-value">Lvl {altarLevel}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
