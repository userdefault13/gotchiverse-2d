/* eslint-disable multiline-ternary */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RealmEvent } from 'types/realm';
import { Input, SearchInput, SortSelect } from 'components/UI/elements';
import { fetchEventsList } from 'helpers/events.helper';
import { SortOption } from 'types';
import { useWeb3 } from 'contexts/Web3Context';
import { HOOD_COL_COUNT, HOOD_ROW_COUNT } from 'shared_code/constants/const.game';
import _ from 'lodash';
import styles from './styles';
import { GotchiverseLoading } from 'assets';
import Image from 'next/image';
import { useRealm } from 'contexts/RealmContext';
import { useUser } from 'contexts/UserContext';
import { EventListCard } from 'components/UI/component';

interface Props {
  onSelect: (id: string, isEvent?: boolean) => void;
  enableInitialFilter?: boolean;
  ownerOnly?: boolean;
  showFilter?: boolean;
  selectedEvent?: string;
  fetchEnabled?: boolean;
}
interface EventFilter {
  searchInput: string;
  sort: SortOption;
  districtInput: number;
}

const eventSortOptions: SortOption[] = [
  {
    name: 'Starting Time',
    value: 'startTime',
    direction: 'desc',
  },
  {
    name: 'Ending Time',
    value: 'endTime',
    direction: 'desc',
  },
  {
    name: 'Priority',
    value: 'priority',
    direction: 'desc',
  },
  {
    name: 'Duration',
    value: 'duration',
    direction: 'desc',
  },
];

export const EventList = ({
  onSelect,
  enableInitialFilter,
  ownerOnly = false,
  showFilter = true,
  selectedEvent,
  fetchEnabled = true,
}: Props): JSX.Element => {
  const [{ eventsList }, realmDispatch] = useRealm();
  const [{ currentNetwork, currentAccount }] = useWeb3();
  const [eventData, setEventData] = useState<RealmEvent[]>();
  const [loading, setLoading] = useState<boolean>(false);
  const [{ eventInitialFilter }] = useUser();
  const [eventFilter, setEventFilter] = useState<EventFilter>({
    searchInput: '',
    sort: {
      name: 'Priority',
      value: 'priority',
      direction: 'desc',
    },
    districtInput: 0,
  });

  useEffect(() => {
    const initial = eventSortOptions.find((item) => item.value === eventInitialFilter);
    if (enableInitialFilter && initial) setEventFilter({ ...eventFilter, sort: initial });
  }, [eventInitialFilter]);

  const sortEvents = useCallback(
    (events) => {
      const sorted = _.sortBy(events, (event) => {
        switch (eventFilter.sort.value) {
          case 'startTime':
            return Number(event.startTime);
          case 'endTime':
            return Number(event.endTime);
          case 'priority':
            return event.priority;
          case 'duration':
            return Number(event.endTime) - Number(event.startTime);
          default:
            return -1; // should not happen, actually
        }
      });
      if (eventFilter.sort.direction === 'desc') return _.reverse(sorted);
      return sorted;
    },
    [eventFilter.sort],
  );

  const filterBySearch = useCallback(
    (events: RealmEvent[], searchInput: string): RealmEvent[] => _.filter(events, (event) => event.title.toLowerCase().includes(searchInput)),
    [],
  );

  const fetchAndSetEvents = async () => {
    setLoading(true);
    const events = await fetchEventsList(currentNetwork, ownerOnly ? currentAccount : undefined);

    if (fetchEnabled) {
      realmDispatch({
        type: 'UPDATE_EVENTS_LIST',
        eventsList: events,
      });
      setEventData(events);
    } else {
      setEventData(_.filter(events, (event) => event.startTime < event.endTime));
    }

    setLoading(false);
  };

  const updateEvents = async () => {
    let filtered = sortEvents(eventData);
    if (eventFilter.searchInput) filtered = filterBySearch(filtered, eventFilter.searchInput);
    if (eventFilter.districtInput) {
      filtered = _.filter(filtered, (realmEvent) => Number(realmEvent.parcel.district) === Number(eventFilter.districtInput));
    }
    if (selectedEvent) {
      const selectedIndex = filtered.findIndex((e) => e.id === selectedEvent);
      if (selectedIndex !== -1) filtered = [filtered[selectedIndex], ...filtered.filter((e, index) => index !== selectedIndex)];
    }

    realmDispatch({
      type: 'UPDATE_EVENTS_LIST',
      eventsList: filtered,
    });
  };

  useEffect(() => {
    if (!fetchEnabled) return;
    void updateEvents();
  }, [eventFilter, eventData, fetchEnabled]);

  useEffect(() => {
    void fetchAndSetEvents();
  }, [ownerOnly]);

  const filteredEvents = useMemo(() => (fetchEnabled ? eventsList : eventData), [eventsList, eventData, fetchEnabled]);

  return (
    <>
      <div className={`content-wrapper ${!showFilter ? 'no-filter' : ''}`}>
        {showFilter && (
          <div className="events-filter">
            <div className="sort-district">
              <div className="sort">
                <span>Sort by</span>
                <SortSelect
                  options={eventSortOptions}
                  selected={eventFilter.sort}
                  width="18rem"
                  size="2rem"
                  useTheme={true}
                  onSelect={(name: string, value: string, direction: 'asc' | 'desc') => {
                    setEventFilter({ ...eventFilter, sort: { name, value, direction } });
                  }}
                />
              </div>
              <div className="district">
                <Input
                  min="1"
                  max={HOOD_ROW_COUNT * HOOD_COL_COUNT}
                  type="number"
                  placeholder="all"
                  value={!eventFilter.districtInput ? '' : eventFilter.districtInput.toString()}
                  label="District"
                  isParcel={true}
                  onChange={(e) => setEventFilter({ ...eventFilter, districtInput: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="search-input">
              <SearchInput
                value={eventFilter.searchInput}
                onChange={(value) => setEventFilter({ ...eventFilter, searchInput: value })}
                placeholder="Search by event name"
              />
            </div>
          </div>
        )}

        <div className="events">
          {loading ? (
            <div className="loading">
              <Image alt="" src={GotchiverseLoading} height={200} width={330} objectFit="contain" />
            </div>
          ) : (
            <>
              {filteredEvents?.map((item, i) => (
                <EventListCard key={i} event={item} onSelect={onSelect} />
              ))}
            </>
          )}
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
