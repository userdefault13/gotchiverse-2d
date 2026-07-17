/* eslint-disable multiline-ternary */
import { Input, SearchInput, SortSelect, StyledTitle, Toggle } from 'components/UI/elements';
import { useEffect, useMemo, useState } from 'react';
import { fetchAndSetGlobalParcels, sortParcels } from 'helpers/parcels.helper';
import { HOOD_COL_COUNT, HOOD_ROW_COUNT } from 'shared_code/constants/const.game';
import { OwnedStatus, SortOption } from 'types';
import _ from 'lodash';
import styles from './styles';
import { ParcelsList } from 'components/UI/structures';
import { useUser } from 'contexts/UserContext';
import { GotchiverseLoading } from 'assets';
import Image from 'next/image';
import { BuyCTACard } from 'components/UI/component';
import { gotchiverseLinks } from 'data/links';

interface Props {
  spawnParcelId: string;
  handleSpawnSelect: (id: string, isParcel?: boolean) => void;
}

const sortOptions: SortOption[] = [
  {
    name: 'ID',
    value: 'id',
    direction: 'asc',
  },
  {
    name: 'Name',
    value: 'name',
    direction: 'asc',
  },
  {
    name: 'Aaltar Lvl',
    value: 'aaltarLvl',
    direction: 'desc',
  },
  {
    name: 'Size',
    value: 'size',
    direction: 'desc',
  },
];

const bottomClipPath = `polygon(
  0 0,
  100% 0,
  100% calc(100% - 3.5rem),
  calc(100% - 11.5rem) calc(100% - 3.5rem),
  calc(100% - 14.2rem) 100%,
  14.2rem 100%,
  11.5rem calc(100% - 3.5rem),
  0 calc(100% - 3.5rem)
)`;

export const SpawnOnParcel = ({ spawnParcelId, handleSpawnSelect }: Props): JSX.Element => {
  const filters = ['all parcels', 'owned', 'borrowed'];
  const [{ ownedParcels, addresses }] = useUser();
  const [searchInput, setSearchInput] = useState<string | undefined>();
  const [districtInput, setDistrictInput] = useState<number>(0);
  const [filter, setFilter] = useState<number>(0);
  const [sort, setSort] = useState<SortOption>(sortOptions[0]);
  const [filterChanneled, setFilterChanneled] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const [isLoading, setLoading] = useState(false);

  const sortedParcels = useMemo(() => {
    if (!ownedParcels) return [];
    return sortParcels(sort, ownedParcels);
  }, [ownedParcels, sort]);

  const rowCount = 3;
  const parcelPlaceholderCount = useMemo(() => {
    if (!sortedParcels) return rowCount * 2;
    const count = sortedParcels.length % 2 === 0 ? sortedParcels.length : sortedParcels.length + 1;
    const result = Math.max(rowCount * 2 - count, 0);
    return result;
  }, [sortedParcels]);

  const fetchParcels = async () => {
    setLoading(true);
    await fetchAndSetGlobalParcels({ district: districtInput, search: searchInput, ownedStatus: filter as OwnedStatus }, page);
    setLoading(false);
  };

  const toggleFilterChanneled = () => setFilterChanneled(!filterChanneled);
  const handleOpenBaazaar = () => window.open(gotchiverseLinks.aavegotchi.marketplace, '_blank');
  const handleOpenLending = () => window.open(gotchiverseLinks.aavegotchi.lending, '_blank');

  useEffect(() => {
    void fetchParcels();
  }, [districtInput, searchInput, filter, page, addresses]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('parcelFilter'));
    setFilterChanneled(data?.filterChanneled);
    setSort(data?.sort || sortOptions[0]);
    setDistrictInput(data?.district || 0);
  }, []);

  useEffect(() => {
    if (filterChanneled === undefined) return;
    localStorage.setItem(
      'parcelFilter',
      JSON.stringify({
        sort,
        filterChanneled,
        district: districtInput,
      }),
    );
  }, [filterChanneled, sort, districtInput]);

  return (
    <>
      <div className="title-container">
        <StyledTitle style="bottom-line-two-side" text="spawn on a parcel" color="info" />
      </div>
      <div className={`content ${isLoading ? 'loading' : ''}`}>
        <div className="filter-buttons">
          {filters.map((_filter, index) => (
            <div className={`filter-button ${filter === index ? 'active' : ''}`} key={index} onClick={() => setFilter(index)}>
              {_filter}
            </div>
          ))}
        </div>
        <div className="filter-container">
          <div className="filters-wrapper">
            <div className="sort">
              <span>Sort by</span>
              <SortSelect
                options={sortOptions}
                selected={sort}
                width="14rem"
                size="1.8rem"
                useTheme
                color="info"
                onSelect={(name: string, value: string, direction: 'asc' | 'desc') => {
                  setSort({ name, value, direction });
                }}
              />
            </div>
            <div className="district">
              <Input
                min="1"
                max={HOOD_ROW_COUNT * HOOD_COL_COUNT}
                type="number"
                placeholder="all"
                value={districtInput ? districtInput.toString() : 'All'}
                label="District"
                color="info"
                isParcel
                onChange={(e) => setDistrictInput(Number(e.target.value))}
              />
            </div>
            <div className="channel-toggle">
              <span className="toggle-title">Channel Ready</span>
              <div className="searching-container">
                <div className={`flex-row centered channel-filter ${!filterChanneled ? 'active' : ''}`}>
                  <Toggle isParcel checked={filterChanneled} onChange={toggleFilterChanneled} useTheme={true} color="info" />
                </div>
              </div>
            </div>
          </div>
          <div className="search-by-name">
            <SearchInput isParcel={true} value={searchInput} onChange={setSearchInput} placeholder="Search by parcel name" color="info" />
          </div>
        </div>
        {isLoading ? (
          <div className="loading-image">
            <Image alt="" src={GotchiverseLoading} height={200} width={330} objectFit="contain" />
          </div>
        ) : (
          <ParcelsList
            items={sortedParcels}
            placeholderCount={parcelPlaceholderCount}
            spawnParcelId={spawnParcelId}
            filterChanneled={filterChanneled}
            scrollContainer=".scrollable.parcels"
            onSelect={handleSpawnSelect}
            useLoadMore
            loading={isLoading}
            onLoadMore={() => setPage(page + 1)}
          />
        )}
        <div className="cta-baazaar-container">
          {!isLoading && parcelPlaceholderCount > 0 && (
            <>
              {filters.indexOf('borrowed') === filter ? (
                <BuyCTACard
                  type="card-lending"
                  title="Borrow Aavegotchis"
                  titleColor="pink"
                  description="You can borrow more Aavegotchis to channel on their parcels!"
                  ctaTitle="Open Lending"
                  outlineColor="info"
                  showCard={parcelPlaceholderCount > 0}
                  showGradient={true}
                  clipPath={bottomClipPath}
                  onClick={handleOpenLending}
                />
              ) : (
                <BuyCTACard
                  type="card-baazaar"
                  title={
                    sortedParcels.length === 0
                      ? 'Buy your parcels'
                      : sortedParcels.length > 0 && sortedParcels.length < 10
                        ? 'Buy more parcels'
                        : null
                  }
                  titleColor="info"
                  description={
                    sortedParcels.length === 0
                      ? "You don't own any parcels yet. You can buy parcels in the Baazaar."
                      : sortedParcels.length > 0 && sortedParcels.length < 10
                        ? 'You can own more Gotchiverse lands. Buy  parcels in the Baazaar!'
                        : null
                  }
                  ctaTitle="Open Baazaar"
                  outlineColor="info"
                  showCard={parcelPlaceholderCount > 0}
                  showGradient={true}
                  clipPath={bottomClipPath}
                  onClick={handleOpenBaazaar}
                />
              )}
            </>
          )}
          <div className="bottom-outline">
            <div className="left"></div>
            <div className="center">
              <div className="diag"></div>
              <div className="bottom-line"></div>
              <div className="anti-diag"></div>
            </div>
            <div className="right"></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .content {
          --grad-height: ${parcelPlaceholderCount > 0 ? '20rem' : '12rem'};
          --base-height: ${parcelPlaceholderCount > 0 ? '20rem' : '4rem'};
        }
      `}</style>
      <style jsx>{styles}</style>
    </>
  );
};
