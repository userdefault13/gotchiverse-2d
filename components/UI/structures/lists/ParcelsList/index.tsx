/* eslint-disable @typescript-eslint/indent */
/* eslint-disable multiline-ternary */
import { GotchiverseParcel, OwnedStatus } from 'types';
import styles from './styles';
import LazyLoad, { forceCheck } from 'react-lazyload';
import { useRef, useState, useEffect, useMemo } from 'react';
import { useIntersectionObserver } from 'hooks/useIntersectionObserver';
import { altarIds, secondsUntilParcelCanChannel } from 'helpers/parcels.helper';
import { useWeb3 } from 'contexts/Web3Context';
import { getTypeByItemId } from 'helpers/installations.helper';
import { useUser } from 'contexts/UserContext';
import { useGame } from 'contexts/GameContext';
import { ParcelCard } from 'components/UI/component';
import _ from 'lodash';

interface Props {
  items: GotchiverseParcel[];
  filterChanneled?: boolean;
  spawnParcelId: string;
  excludeLandlords?: string[];
  mode?: 'wide' | 'narrow';
  scrollContainer: string | undefined;
  page?: number;
  onSelect: (parcelId: string, isParcel?: boolean) => void;
  useLoadMore?: boolean;
  onLoadMore?: () => void;
  placeholderCount?: number;
  loading?: boolean;
}

export const ParcelsList = ({
  items,
  filterChanneled,
  spawnParcelId,
  excludeLandlords,
  scrollContainer,
  mode = 'narrow',
  onSelect,
  useLoadMore,
  onLoadMore,
  placeholderCount = 0,
  loading,
}: Props): JSX.Element => {
  const [freeze, setFreeze] = useState<boolean>();
  const observer = useRef<null>(null);
  const [{ currentAccount }] = useWeb3();
  const [{ gameConfig }] = useGame();
  const [{ ownedParcels }, userDispatch] = useUser();
  const lastParcelRef = useRef(null);

  // eslint-disable-next-line no-void
  const handleLastItem = useIntersectionObserver(observer, () => useLoadMore && onLoadMore(), {
    dependencies: [observer, ownedParcels],
    freeze: loading || freeze,
  });

  const itemsShow = useMemo(() => {
    if (!useLoadMore) {
      return items;
    }
    // Order the parcels so that the spawn parcel is always first
    const orderedParcels =
      items?.sort((a, b) => {
        if (!spawnParcelId) return 0;
        if (a.parcelId === spawnParcelId) return -1;
        if (b.parcelId === spawnParcelId) return 1;
        return 0;
      }) ?? [];

    return excludeLandlords?.length ? _.filter(orderedParcels, (parcel) => !excludeLandlords?.includes(parcel.owner)) : orderedParcels;
  }, [items, spawnParcelId, useLoadMore, excludeLandlords]);

  useEffect(() => {
    if (!useLoadMore) return;
    const interval = setInterval(() => forceCheck(), 1000);
    setFreeze(!!items?.length && !!(items.length % 1000));
    return () => clearInterval(interval);
  }, [items, useLoadMore]);

  return (
    <>
      <div className={`parcel-list ${mode} scrollable hidden ${items?.length >= 10 ? 'clipped' : ''}`}>
        {itemsShow?.map((item, i) => {
          const isLast = i === itemsShow.length - 1;
          const isBorrowed = item.owner ? item.owner.toLocaleLowerCase() !== currentAccount.toLocaleLowerCase() : false;
          const secondsUntilChannel = secondsUntilParcelCanChannel(
            item.lastChanneledAlchemica,
            item.equippedInstallations?.find((installation) => altarIds.includes(installation.id))?.id,
          );
          const altar = item.equippedInstallations?.find(({ id }) => getTypeByItemId(Number(id)).installationType === 0);

          return !filterChanneled || secondsUntilChannel == null || secondsUntilChannel === 0 ? (
            <div
              key={item.tokenId || item.parcelId || i}
              className="parcel-card-item"
              ref={(el) => {
                if (item.parcelId === spawnParcelId) lastParcelRef.current = el;
              }}
            >
              {useLoadMore ? (
                <LazyLoad style={{ width: '100%' }} once scrollContainer={scrollContainer} overflow>
                  <div
                    ref={isLast ? handleLastItem : undefined}
                    className={`clickable ${item.parcelId === spawnParcelId && 'active'} ${isBorrowed ? 'borrowed' : ''} ${
                      gameConfig.gotchiverseTheme
                    }`}
                    onClick={() => {
                      if (isBorrowed) {
                        userDispatch({
                          type: 'UPDATE_PARCELS_ACCESS_OWNERS',
                          parcelAccessOwners: [item?.owner?.toLocaleLowerCase(), currentAccount.toLocaleLowerCase()],
                        });
                      }
                      onSelect(item.parcelId, true);
                    }}
                  >
                    <ParcelCard
                      isBorrowed={isBorrowed}
                      item={item}
                      mode={mode}
                      secondsUntilChannel={secondsUntilChannel}
                      altarLevel={getTypeByItemId(Number(altar?.id))?.level}
                      active={item.parcelId === spawnParcelId}
                    />
                  </div>
                </LazyLoad>
              ) : (
                <div
                  className={`clickable ${item.parcelId === spawnParcelId && 'active'} ${isBorrowed ? 'borrowed' : ''} ${
                    gameConfig.gotchiverseTheme
                  }`}
                  onClick={() => {
                    if (isBorrowed) {
                      userDispatch({
                        type: 'UPDATE_PARCELS_ACCESS_OWNERS',
                        parcelAccessOwners: [item?.owner?.toLocaleLowerCase(), currentAccount.toLocaleLowerCase()],
                      });
                    }
                    onSelect(item.parcelId, true);
                  }}
                >
                  <ParcelCard
                    isBorrowed={isBorrowed}
                    item={item}
                    mode={mode}
                    secondsUntilChannel={secondsUntilChannel}
                    altarLevel={getTypeByItemId(Number(altar?.id))?.level}
                    active={item.parcelId === spawnParcelId}
                  />
                </div>
              )}
            </div>
          ) : null;
        })}
        {placeholderCount > 0
          ? _.fill(Array(placeholderCount), null).map((_, i) => (
              <div key={i} className="parcel-card-item">
                <ParcelCard mode={mode} />
              </div>
            ))
          : null}
      </div>

      <style jsx>{styles}</style>
    </>
  );
};
