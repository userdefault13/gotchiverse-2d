import { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './styles';
import { useWeb3 } from 'contexts/Web3Context';
import { Aavegotchi, SortOption } from 'types';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import LazyLoad from 'react-lazyload';
import { SearchInput } from 'components/UI/elements';
import { SortSelect } from 'components/UI/elements/inputs/sortSelect';
import Image from 'next/image';
import { getThemeColor } from 'helpers/functions';
import { GotchiTongueIcon } from 'assets';
import { GotchiPlaceholderCard, GotchiSelectCard, MintCartridgeCard } from 'components/UI/component';
import { fetchAndSetGlobalAavegotchis, getSpectator } from 'helpers/gotchi.helper';
import { mapCartridgeHeroToGotchi } from 'helpers/cartridgeHero.helper';
import { useUser } from 'contexts/UserContext';
import { useGame } from 'contexts/GameContext';
import { ChannelReadyToggle } from 'components/UI/elements/buttons/channelReadyToggle';
import type { GotchiverseAavegotchi } from 'types';

const sortOptions: SortOption[] = [
  { name: 'Token ID', value: 'tokenId', direction: 'asc' },
  { name: 'BRS', value: 'brs', direction: 'desc' },
  { name: 'Kinship', value: 'kinship', direction: 'desc' },
  { name: 'Name', value: 'name', direction: 'desc' },
];

interface Props {
  placeholderCount?: number;
  handleSelect: (gotchi: Aavegotchi) => void;
  selectedId?: string;
  storedId?: string;
  mintMode?: boolean;
  /** `cartridge` | `caavegotchi` mint step — Base/RH soft-launch mint flow. */
  mintStep?: 'cartridge' | 'caavegotchi' | null;
  onMintCartridgeClick?: () => void;
  /** Manage mode: bound cAavegotchis open a stub manage modal instead of selecting for play. */
  onManageCaavegotchiClick?: (gotchi: GotchiverseAavegotchi) => void;
}

export const GotchiSelectPanel = ({
  placeholderCount,
  handleSelect,
  selectedId,
  mintMode,
  mintStep: _mintStep,
  onMintCartridgeClick,
  onManageCaavegotchiClick,
}: Props): JSX.Element => {
  const [{ currentAccount, currentNetwork }] = useWeb3();
  const { click } = useAavegotchiSound();
  const [fetching, setFetching] = useState(false);
  const [sort, setSort] = useState<SortOption>();
  const [search, setSearch] = useState<string>();
  const [searchInput, setSearchInput] = useState<string>();
  const [{ userAavegotchis, hasCartridge, cartridgeHeroes }] = useUser();
  const [{ gameConfig }] = useGame();
  const [channelReady, setChannelReady] = useState<boolean>();
  const [optionLoaded, setOptionLoaded] = useState<boolean>(false);

  // Soft-launch Base/RH: left rail is Freebie + Manage + bound cAavegotchis (wallet gotchis mint from right tab).
  const cartridgeSelectMode = currentNetwork === 'base' || currentNetwork === 'robinhood';

  const cartridgeGotchis = useMemo(() => {
    if (!currentAccount || !cartridgeHeroes?.length) return [] as GotchiverseAavegotchi[];
    return cartridgeHeroes.map((hero) => mapCartridgeHeroToGotchi(hero, currentAccount));
  }, [cartridgeHeroes, currentAccount]);

  // Legacy (matic / non–soft-launch): show L1 wallet gotchis in the left rail.
  const showWalletGotchis = !cartridgeSelectMode;

  const loadOptions = () => {
    let sortOption = localStorage.getItem('gotchiSortOption') || 'brs';
    const validOption = sortOptions.reduce((found, opt) => found || opt.value === sortOption, false);
    if (!validOption) sortOption = sortOptions[0].value;

    let sortDir = localStorage.getItem('gotchiSortDir');
    if (sortDir !== 'asc' && sortDir !== 'desc') {
      const opt = sortOptions.find((opt) => opt.value === sortOption);
      sortDir = opt.direction;
    }
    const option = sortOptions.find((option) => option.value === sortOption);
    setSort({ ...option, direction: sortDir as 'asc' | 'desc' });

    const filterOption = JSON.parse(localStorage.getItem('gotchiFilterOption'));
    setChannelReady(filterOption?.channelReady ?? false);
  };

  useEffect(() => {
    if (currentNetwork) {
      if (currentAccount && sort?.value && sort.direction) void fetchAavegotchi();
      else handleSelect(undefined);
    }
  }, [currentNetwork, currentAccount, sort, search, gameConfig.demoGotchiMode, channelReady]);

  const fetchAavegotchi = useCallback(async () => {
    setFetching(true);
    void fetchAndSetGlobalAavegotchis(false, { sortValue: `${sort.value}_${sort.direction}`, searchValue: search, channelReady });
    setFetching(false);
  }, [sort, search, channelReady]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      setFetching(false);
      setSearch(searchInput);
    }, 2000);

    setFetching(true);

    return () => clearTimeout(delaySearch);
  }, [searchInput]);

  useEffect(() => {
    loadOptions();
    setOptionLoaded(true);
  }, []);

  useEffect(() => {
    if (!optionLoaded) {
      return;
    }
    if (sort?.direction && sort.value) {
      localStorage.setItem('gotchiSortOption', sort.value);
      localStorage.setItem('gotchiSortDir', sort.direction);
    }
    localStorage.setItem('gotchiFilterOption', JSON.stringify({ channelReady: channelReady }));
  }, [sort, channelReady]);

  const joinAsObservoor = useCallback(() => {
    click();
    handleSelect(getSpectator(currentAccount));
  }, [currentAccount, click, handleSelect]);

  const visibleWalletGotchis = showWalletGotchis ? userAavegotchis || [] : [];
  const gridItemCount = (visibleWalletGotchis?.length || 0) + (cartridgeGotchis?.length || 0);

  // Freebie + Manage/Mint Cartridge + cartridge heroes + owned gotchis.
  const placeholderAavegotchis = useMemo(() => {
    const filled = gridItemCount + 2;
    return Array.from({ length: Math.max((placeholderCount || 0) - filled, 0) }, (_, i) => i);
  }, [gridItemCount, placeholderCount]);

  const handleCartridgeGotchiClick = (gotchi: GotchiverseAavegotchi) => {
    if (mintMode && onManageCaavegotchiClick) {
      onManageCaavegotchiClick(gotchi);
      return;
    }
    handleSelect(gotchi);
  };

  return (
    <>
      <div className="details-container">
        <h1 className="select-panel-title">Select your Gotchi</h1>
        <div className="filter-section">
          <div className="filter-option">
            <SearchInput
              width="100%"
              height="100%"
              color={`${getThemeColor('info')}`}
              value={searchInput || ''}
              onChange={setSearchInput}
              placeholder="Token ID, Name"
              fontFamily="Kimberley Rg"
              fontSize="1.2rem"
              shadow={false}
            />
          </div>
          <div className="filter-option">
            <SortSelect
              options={sortOptions}
              placeholder="Sort by"
              selected={sort}
              onSelect={(name: string, value: string, direction: 'asc' | 'desc') => {
                setSort({ name, value, direction });
              }}
              color="info"
              width="13.5rem"
              useTheme={true}
              fontFamily="Kimberley Rg"
              fontSize="1.2rem"
              shadow={false}
            />
          </div>
          <div className="filter-option channel-toggle">
            {channelReady !== undefined && (
              <ChannelReadyToggle
                label="Ready to Channel"
                borderColor="#00B9E1"
                backgroundColor="rgba(81, 27, 221, 0.5)"
                active={channelReady}
                onClick={() => setChannelReady(!channelReady)}
              />
            )}
          </div>
        </div>

        {!fetching && !cartridgeSelectMode && userAavegotchis?.length === 0 && !search && channelReady && (
          <div className="empty-state">
            <p className="empty-comment">{'No aavegotchi is ready to channel at the moment'}</p>
            <div className="gotchi-img">
              <Image alt="" src={GotchiTongueIcon} objectFit="contain" />
            </div>
            <p>Turn off the filter to see all of your Aavegotchis</p>
          </div>
        )}
        <div className={`gotchi-list-container ${gridItemCount > 9 ? 'shade' : ''}`}>
          <div className={`gotchi-list-inner scrollable ${gridItemCount > 12 ? 'info' : 'hidden'}`}>
            <div className="gotchi-card">
              <GotchiSelectCard
                gotchi={getSpectator(currentAccount)}
                isSelected={!mintMode && selectedId?.toLowerCase() === currentAccount?.toLowerCase()}
                handleSelect={joinAsObservoor}
              />
            </div>
            <div className="gotchi-card">
              <MintCartridgeCard
                network={currentNetwork}
                isSelected={!!mintMode}
                hasCartridge={!!hasCartridge}
                onClick={onMintCartridgeClick}
              />
            </div>
            {cartridgeGotchis.map((gotchi) => (
              <div key={gotchi.id} className="gotchi-card">
                <GotchiSelectCard
                  gotchi={gotchi}
                  isSelected={!mintMode && gotchi.id === selectedId}
                  handleSelect={handleCartridgeGotchiClick}
                />
              </div>
            ))}
            {visibleWalletGotchis.map((gotchi, i) => (
              <div key={i} className="gotchi-card">
                <LazyLoad once overflow={true} height={160}>
                  <GotchiSelectCard
                    gotchi={gotchi}
                    isSelected={!mintMode && gotchi.id === selectedId}
                    handleSelect={(g) => {
                      handleSelect(g);
                    }}
                  />
                </LazyLoad>
              </div>
            ))}
            {placeholderAavegotchis.map((_, i) => (
              <div key={i} className="gotchi-card gotchi-placeholder">
                <GotchiPlaceholderCard />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{styles}</style>
    </>
  );
};
