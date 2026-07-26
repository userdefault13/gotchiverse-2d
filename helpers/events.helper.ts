import { useSubgraph } from 'web3/subgraph';
import { BounceGateEvents, RealmEvent } from 'types/realm';
import { PARCELS_BY_TOKEN_ID } from 'shared_code/models/model.realm';
import _ from 'lodash';
import { JsonParcel } from 'types';
import { gotchiverseSubgraph } from 'shared_code/web3/shared.const.web3';

const DECAY = 0.0001;

const mapInProps = (bounceGateEvents: RealmEvent[]) => {
  const now = Date.now() / 1000;
  // First map in parcelId for each event; skip events with unknown parcels.
  return _.compact(
    _.map(bounceGateEvents, (event) => {
      const parcelData: JsonParcel = PARCELS_BY_TOKEN_ID[event.id];
      if (!parcelData?.parcelId) return null;
      event.parcelId = parcelData.parcelId;
      event.parcel = parcelData;
      event.active = !event.cancelled && event.startTime < now && event.endTime > now;
      return event;
    }),
  );
};

const updatePriorities = (bounceGateEvents: RealmEvent[]) => {
  return bounceGateEvents.map((event) => {
    if (event.active) {
      // Priority is sent *1000 since contract don't allow float numbers.
      event.basePriority = Math.floor(event.priority / 1000);
      const minutesDelta = (Date.now() / 1000 - event.lastTimeUpdated) / 60;
      event.minutesDelta = minutesDelta;
      const newPriority = event.basePriority * Math.pow(1 - DECAY, minutesDelta);
      // console.log('updatePriorities', event.title, minutesDelta, event.priority, newPriority);
      event.priority = Number(newPriority.toFixed());
    }
    return event;
  });
};

const addParcelImages = async (bounceGateEvents: RealmEvent[]) => {
  const parcelIds = bounceGateEvents.map(({ parcelId }) => parcelId);
  // const parcelId = 'C-5010-2906-V';
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/realm/events/image?parcelId=${parcelIds}`);
  if (response.status === 200) {
    const parcelToImage = await response.json();

    bounceGateEvents = bounceGateEvents.map((event) => {
      event.image = parcelToImage?.data?.[event.parcelId]?.image;
      return event;
    });
  }
  return bounceGateEvents;
};

const fetchAndMapOnlinePlayers = async (bounceGateEvents: RealmEvent[]) => {
  const parcelIds = bounceGateEvents.map(({ parcelId }) => parcelId);
  // const parcelId = 'C-5010-2906-V';
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/realm/bounce-gate-event/metrics?parcelId=${parcelIds}`);
  if (response.status === 200) {
    const parcelToUsers = await response.json();
    bounceGateEvents = bounceGateEvents.map((event) => {
      event.count = parcelToUsers?.data?.[event.parcelId]?.count ?? 0;
      return event;
    });
  }
  return bounceGateEvents;
};

export const fetchEventsList = async (network: string, owner?: string) => {
  // Base Gotchiverse subgraph does not index `bounceGateEvents`; skip to avoid 400 spam.
  if (process.env.NEXT_PUBLIC_DISABLE_BOUNCE_GATES === 'true') return [];
  try {
    const timeSecondsNow = Number(Number(Date.now() / 1000).toFixed()).toString();
    const query = `{bounceGateEvents( where:{ cancelled:false, endTime_gt:"${timeSecondsNow}" ${owner ? ', creator: "' + owner + '"' : ''}}){
      id
      title
      priority
      startTime
      endTime
      lastTimeUpdated
      cancelled
      equipped
  }}`;
    const graph = network && network === 'mumbai' ? 'https://api.thegraph.com/subgraphs/name/froid1911/relm-1689' : gotchiverseSubgraph;
    const eventsRes: BounceGateEvents = await useSubgraph(query, graph);
    // console.log('eventsRes:', eventsRes);

    let eventsData: RealmEvent[] = eventsRes?.bounceGateEvents || [];
    // manual filter out wrong events
    eventsData = _.filter(eventsData, ({ endTime }) => endTime.toString().length <= 10);
    if (!eventsData.length) return [];

    eventsData = mapInProps(eventsData);
    eventsData = updatePriorities(eventsData);
    eventsData = await addParcelImages(eventsData);
    eventsData = await fetchAndMapOnlinePlayers(eventsData);
    console.log('EventsList:', eventsData);
    return eventsData;
  } catch (err) {
    console.warn('fetchEventsList failed', err);
    return [];
  }
};
