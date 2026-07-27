/* eslint-disable multiline-ternary */
import { Input, SearchInput, SortSelect, StyledTitle, Toggle } from 'components/UI/elements';
import { useEffect, useMemo, useState } from 'react';
import { sortParcels } from 'helpers/parcels.helper';
import { cPaarcelsToGotchiverseParcels } from 'helpers/cartridgePaarcel.helper';
import { HOOD_COL_COUNT, HOOD_ROW_COUNT } from 'shared_code/constants/const.game';
import { GotchiverseParcel, OwnedStatus, SortOption } from 'types';
import styles from './styles';
import { ParcelsList } from 'components/UI/structures';
import { useUser } from 'contexts/UserContext';
import { useWeb3 } from 'contexts/Web3Context';
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

function filterParcelsLocally(
  parcels: GotchiverseParcel[],
  opts: { district?: number; search?: string; ownedStatus?: OwnedStatus; currentAccount?: string },
): GotchiverseParcel[] {
  let out = parcels || [];
  if (opts.district) {
    out = out.filter((p) => Number(p.district) === Number(opts.district));
  }
  if (opts.search) {
    const q = opts.search.trim().toLowerCase();
    if (q) {
      out = out.filter((p) => {
        const hash = String(p.parcelHash || '').toLowerCase();
        const pid = String(p.parcelId || '').toLowerCase();
        const tid = String(p.tokenId || p.id || '');
        return hash.includes(q) || pid.includes(q) || tid.includes(q);
      });
    }
  }
  // cPaarcels are always wallet-owned; borrowed filter → empty.
  if (opts.ownedStatus === (2 as OwnedStatus)) return [];
  if (opts.ownedStatus === (1 as OwnedStatus) && opts.currentAccount) {
    const me = opts.currentAccount.toLowerCase();
    out = out.filter((p) => !p.owner || p.owner.toLowerCase() === me);
  }
  return out;
}

export const SpawnOnParcel = ({ spawnParcelId, handleSpawnSelect }: Props): JSX.Element => {
  const filters = ['all parcels', 'owned', 'borrowed'];
  const [{ parcelInventory }] = useUser();
  const [{ currentAccount }] = useWeb3();
  const [searchInput, setSearchInput] = useState<string | undefined>();
  const [districtInput, setDistrictInput] = useState<number>(0);
  const [filter, setFilter] = useState<number>(0);
  const [sort, setSort] = useState<SortOption>(sortOptions[0]);
  const [filterChanneled, setFilterChanneled] = useState<boolean>(false);
  const [isLoading, setLoading] = useState(false);

  /** Soft-launch: spawn list = minted cPaarcels (Base cartridge inventory) on all citaadel nets. */
  const cPaarcelParcels = useMemo(
    () => cPaarcelsToGotchiverseParcels(parcelInventory, currentAccount || undefined),
    [parcelInventory, currentAccount],
  );

  const sortedParcels = useMemo(() => {
    const filtered = filterParcelsLocally(cPaarcelParcels, {
      district: districtInput,
      search: searchInput,
      ownedStatus: filter as OwnedStatus,
      currentAccount: currentAccount || undefined,
    });
    return sortParcels(sort, filtered);
  }, [cPaarcelParcels, sort, districtInput, searchInput, filter, currentAccount]);

  const rowCount = 3;
  const parcelPlaceholderCount = useMemo(() => {
    if (!sortedParcels) return rowCount * 2;
    const count = sortedParcels.length % 2 === 0 ? sortedParcels.length : sortedParcels.length + 1;
    const result = Math.max(rowCount * 2 - count, 0);
    return result;
  }, [sortedParcels]);

  const toggleFilterChanneled = () => setFilterChanneled(!filterChanneled);
  const handleOpenBaazaar = () => window.open(gotchiverseLinks.aavegotchi.marketplace, '_blank');

  useEffect(() => {
    setLoading(false);
  }, []);

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
        <StyledTitle style="bottom-line-two-side" text="spawn on a cpaarcel" color="info" />
      </div>
      <div className={`content ${isLoading ? 'loading' : ''}`}>
        <div className="filter-buttons">
          {filters
            .filter((f) => f !== 'borrowed')
            .map((_filter) => {
              // Keep ownedStatus indices stable (all=0, owned=1).
              const filterIndex = filters.indexOf(_filter);
              return (
                <div
                  className={`filter-button ${filter === filterIndex ? 'active' : ''}`}
                  key={_filter}
                  onClick={() => setFilter(filterIndex)}
                >
                  {_filter}
                </div>
              );
            })}
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
            useLoadMore={false}
            loading={isLoading}
          />
        )}
        <div className="cta-baazaar-container">
          {!isLoading && parcelPlaceholderCount > 0 && (
            <BuyCTACard
              type="card-baazaar"
              title={
                sortedParcels.length === 0
                  ? 'Mint your cPaarcels'
                  : sortedParcels.length > 0 && sortedParcels.length < 10
                    ? 'Mint more cPaarcels'
                    : null
              }
              titleColor="info"
              description={
                sortedParcels.length === 0
                  ? "You don't have any cPaarcels yet. Open Manage → cPaarcels to mint from your Base parcels."
                  : sortedParcels.length > 0 && sortedParcels.length < 10
                    ? 'Mint more Base parcels into your cartridge from Manage → cPaarcels.'
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
