import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import styles from './styles';
import { useWeb3 } from 'contexts/Web3Context';
import { Aavegotchi, SortOption } from 'types';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import LazyLoad from 'react-lazyload';
import { SearchInput, Button } from 'components/UI/elements';
import { SortSelect } from 'components/UI/elements/inputs/sortSelect';
import Image from 'next/image';
import { getThemeColor } from 'helpers/functions';
import { GotchiTongueIcon, Baazaar } from 'assets';
import { GotchiPlaceholderCard, GotchiSelectCard, BuyCTACard, MintCartridgeCard } from 'components/UI/component';
import { fetchAndSetGlobalAavegotchis, getSpectator } from 'helpers/gotchi.helper';
import { mapCartridgeHeroToGotchi } from 'helpers/cartridgeHero.helper';
import { useUser } from 'contexts/UserContext';
import { useGame } from 'contexts/GameContext';
import { ChannelReadyToggle } from 'components/UI/elements/buttons/channelReadyToggle';
import { gotchiverseLinks } from 'data/links';
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
  /** `cartridge` | `caavegotchi` mint step — Base hides L1 wallet gotchis until cAavegotchi bind. */
  mintStep?: 'cartridge' | 'caavegotchi' | null;
  onMintCartridgeClick?: () => void;
}

export const GotchiSelectPanel = ({
  placeholderCount,
  handleSelect,
  selectedId,
  mintMode,
  mintStep,
  onMintCartridgeClick,
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

  const cartridgeGotchis = useMemo(() => {
    if (!currentAccount || !cartridgeHeroes?.length) return [] as GotchiverseAavegotchi[];
    return cartridgeHeroes.map((hero) => mapCartridgeHeroToGotchi(hero, currentAccount));
  }, [cartridgeHeroes, currentAccount]);

  // Soft-launch Base: Nakey + Mint Cartridge first; reveal L1 wallet gotchis only
  // while binding a cAavegotchi. RH stays cartridge-only. Bound cAavegotchis always show.
  const showWalletGotchis =
    currentNetwork === 'robinhood'
      ? false
      : currentNetwork === 'base'
        ? mintStep === 'caavegotchi'
        : true;

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
  }, [currentAccount]);

  const visibleWalletGotchis = showWalletGotchis ? userAavegotchis || [] : [];

  // Reserve slots for Nakey + Mint/Manage Cartridge + cartridge heroes + owned gotchis.
  const placeholderAavegotchis = useMemo(() => {
    const filled = (visibleWalletGotchis?.length || 0) + (cartridgeGotchis?.length || 0) + 2;
    return Array.from({ length: Math.max((placeholderCount || 0) - filled, 0) }, (_, i) => i);
  }, [visibleWalletGotchis, cartridgeGotchis, placeholderCount]);

  const handleOpenBaazaar = () => window.open(gotchiverseLinks.aavegotchi.marketplace, '_blank');

  const buyMoreDescription = useMemo(() => {
    if (userAavegotchis?.length === 0) {
      return "You don't have Aavegotchis yet. You can buy them in the Baazaar.";
    }
    if (userAavegotchis?.length < 10) {
      return 'You can extend your Aavegotchi collection. Buy more in the Baazaar!';
    }
    return '';
  }, [userAavegotchis]);

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
          {/* <SortDropdown sortOptions={sortOptions} onSort={setSort} value={sort} /> */}
        </div>
        {/* {userAavegotchis?.length > 0 && <div className="results-container">{(fetching || searching) && <Loader size={0.2} />}</div>} */}

        {!fetching && userAavegotchis?.length === 0 && !search && channelReady && (
          <div className="empty-state">
            <p className="empty-comment">{'No aavegotchi is ready to channel at the moment'}</p>
            <div className="gotchi-img">
              <Image alt="" src={GotchiTongueIcon} objectFit="contain" />
            </div>
            <p>Turn off the filter to see all of your Aavegotchis</p>
          </div>
        )}
        {/* {!fetching && userAavegotchis?.length === 0 && !search && !channelReady && (
          <div className="empty-state">
            <h4>You don&apos;t have aavegotchis yet</h4>
            <p className="pb-4 text-left md:text-center">
              You can buy your Aavegotchis <br /> in the Baazaar and enjoy all the game features!
            </p>
            <div className="baazaar-link-container">
              <div className="baazaar-img">
                <Image alt="" src={Baazaar} objectFit="contain" />
              </div>
              <a href="https://app.aavegotchi.com/baazaar/realm" target="__blank">
                <Button size={3}>Open Baazaar</Button>
              </a>
            </div>
          </div>
        )} */}
        <div className={`gotchi-list-container ${visibleWalletGotchis?.length > 9 ? 'shade' : ''}`}>
          <div className={`gotchi-list-inner scrollable ${visibleWalletGotchis?.length > 12 ? 'info' : 'hidden'}`}>
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
                  handleSelect={(g) => {
                    handleSelect(g);
                  }}
                />
              </div>
            ))}
            {visibleWalletGotchis.map((gotchi, i) => (
              <div key={i} className="gotchi-card">
                <LazyLoad once overflow={true} height={160}>
                  <GotchiSelectCard
                    gotchi={gotchi}
                    isSelected={!mintMode && gotchi.id === selectedId}
                    handleSelect={(gotchi) => {
                      handleSelect(gotchi);
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

        {/* {userAavegotchis?.length === 0 && search && (
            <div className="empty-state">
              <h4 className="title">No results found with search: &quot;{search}&quot;</h4>
            </div>
          )} */}
        {showWalletGotchis && userAavegotchis?.length < 12 && currentNetwork !== 'robinhood' && (
          <div className="cta-baazaar-container">
            <BuyCTACard
              type="card-baazaar"
              title="Buy More Aavegotchis!"
              titleColor="pink"
              description={buyMoreDescription}
              ctaTitle="Open Baazaar"
              outlineColor="pink"
              showCard={true}
              showGradient={true}
              clipPath="inset(1% 1% 1% 1% round 0.75rem)"
              onClick={handleOpenBaazaar}
            />
          </div>
        )}
      </div>

      <style jsx>{styles}</style>
    </>
  );
};
