/* eslint-disable multiline-ternary */
import { EndTimeIcon, EventPriceIcon, PinkRay, StartTimeIcon, ToolboxIcon } from 'assets';
import InputController from 'components/controllers/inputController';
import { Button } from 'components/UI/elements';
import { useUI } from 'contexts/UIContexts';
import { useWeb3 } from 'contexts/Web3Context';
import { fetchEventsList } from 'helpers/events.helper';
import { isOwnedById } from 'helpers/installations.helper';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { PARCELS_BY_ID } from 'shared_code/models/model.realm';
import { getInstallationIdDataById } from 'shared_code/utils/shared.utils.installations';
import { JsonParcel, RealmEvent } from 'types';
import { ShareLink } from '../components/ShareLink';
import styles from './styles';

export const EventHologram = (): JSX.Element => {
  const [{ currentNetwork }] = useWeb3();
  const [{ eventHologramState }, uiDispatch] = useUI();
  const [event, setEvent] = useState<RealmEvent>(undefined);
  const [isStartMinutes, setIsStartMinutes] = useState<boolean>();
  const [isEndMinutes, setIsEndMinutes] = useState<boolean>();
  const [startTimeText, setStartTimeText] = useState<number>();
  const [endTimeText, setEndTimeText] = useState<number>();
  const [loading, setLoading] = useState<boolean>(true);
  const [isOwned, setIsOwned] = useState<boolean>(false);
  const [linkCopied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    void fetchEvent();
  }, [eventHologramState]);

  useEffect(() => {
    if (!event) return;
    const { startTime, endTime } = event;

    const nowEpoch = Number(Number(Date.now() / 1000).toFixed());
    let startText = Math.floor((nowEpoch - Number(startTime)) / 3600);
    if (startText === 0) {
      setIsStartMinutes(true);
      startText = Math.floor((nowEpoch - Number(startTime)) / 60);
    }
    setStartTimeText(startText);

    let endText = Math.floor((Number(endTime) - nowEpoch) / 3600);
    if (endText === 0) {
      endText = Math.ceil((Number(endTime) - nowEpoch) / 60);
      setIsEndMinutes(true);
    }
    endText = endText < 0 ? 0 : endText;
    setEndTimeText(endText);
  }, [event]);

  const fetchEvent = async () => {
    InputController.updateDisableKeyboard(eventHologramState.open);
    if (eventHologramState?.open && eventHologramState.installationId) {
      setLoading(true);
      try {
        const owned = isOwnedById(eventHologramState.installationId);
        setIsOwned(!!owned);

        const installationData = getInstallationIdDataById(eventHologramState.installationId);
        const parcelEvent: JsonParcel = installationData ? PARCELS_BY_ID[installationData.parcelId] : undefined;

        if (parcelEvent?.tokenId) {
          const events = await fetchEventsList(currentNetwork);
          const myEvent = (events || []).find((e: RealmEvent) => String(e.id) === String(parcelEvent.tokenId));
          setEvent(myEvent);
        } else {
          setEvent(undefined);
        }
      } catch (err) {
        console.warn('EventHologram: failed to load bounce gate event', err);
        setEvent(undefined);
      } finally {
        setLoading(false);
      }
    } else {
      setEvent(undefined);
      setLoading(false);
    }
  };

  const handleCreate = () => {
    uiDispatch({
      type: 'UPDATE_EVENTS_MODAL',
      eventsModal: eventHologramState,
    });
  };
  const blockPropagation = (e) => e.stopPropagation();

  return (
    <>
      {eventHologramState.open && (
        <div className="hologram-container absolute-centered" onMouseDown={blockPropagation}>
          <div className="event-container">
            <div className="event-image-container">
              <div className="left-cap"></div>
              {event ? (
                <div className="img-wrapper">
                  <div className="inner">
                    <Image alt="" src={`https://gotchiverse.s3.ap-northeast-1.amazonaws.com/${event.id}.png`} layout="fill" objectFit="cover" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="inner-box">
                    <div className="left-cap"></div>
                    <div className="content">
                      <div className="toolbox-wrapper">
                        <Image alt="" src={ToolboxIcon} layout="fill" />
                      </div>
                      <div className="text">{loading ? 'Loading Bounce Gate…' : 'No active event on this Bounce Gate'}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className={`event-info-container ${event ? '' : 'empty'}`}>
              {linkCopied && <div className="link-copied">Link copied!</div>}
              <div className="bg-wrapper">
                <div className="inner">
                  {event ? (
                    <>
                      <div className="title-wrapper">
                        <div className="title">{event.title}</div>
                        <ShareLink event={event} color="var(--col-pink-400)" onCopy={() => setCopied(true)} />
                      </div>
                      <div className="info-wrapper">
                        <div className="event-time">
                          <div className="start-time">
                            <span className="icon">
                              <Image alt="" src={StartTimeIcon} layout="fill" />
                            </span>
                            <p className="text">
                              {startTimeText} {isStartMinutes ? 'mins' : 'hrs'} ago
                            </p>
                          </div>
                          <div className="end-time">
                            <span className="icon">
                              <Image alt="" src={EndTimeIcon} layout="fill" />
                            </span>
                            <p className="text">
                              Ends in {endTimeText} {isEndMinutes ? 'mins' : 'hrs'}
                            </p>
                          </div>
                        </div>
                        <div className="price">
                          <span className="icon">
                            <Image alt="" src={EventPriceIcon} />
                          </span>
                          <p className="text">{event.count}</p>
                        </div>
                      </div>
                      <div className="btn-wrapper">
                        {isOwned && (
                          <div className="cta">
                            <Button size={1.8} color="secondary" onClick={handleCreate}>
                              Create Event
                            </Button>
                          </div>
                        )}
                        <div className="cta">
                          <Button
                            size={1.8}
                            onClick={() =>
                              uiDispatch({
                                type: 'UPDATE_ACTIVE_EVENTS_MODAL',
                                activeEventsModal: {
                                  open: true,
                                },
                              })
                            }
                          >
                            More Events
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="btn-wrapper">
                        {isOwned && (
                          <div className="cta">
                            <Button size={1.8} color="secondary" onClick={handleCreate} fullWidth>
                              Create Event
                            </Button>
                          </div>
                        )}
                        <div className="cta">
                          <Button
                            size={1.8}
                            onClick={() =>
                              uiDispatch({
                                type: 'UPDATE_ACTIVE_EVENTS_MODAL',
                                activeEventsModal: {
                                  open: true,
                                },
                              })
                            }
                          >
                            More Events
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className={`ray-container ${event ? '' : 'empty'}`}>
            <Image alt="" src={PinkRay} layout="fill" />
          </div>
        </div>
      )}

      <style jsx>{styles}</style>
    </>
  );
};
