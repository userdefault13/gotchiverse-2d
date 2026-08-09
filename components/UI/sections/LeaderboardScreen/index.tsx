import _ from 'lodash';
import styles from './styles';
import { useEffect, useState } from 'react';
import { getLeaderboardAll } from 'helpers/api.helpers';
import { smartTrim } from 'helpers/ethers.helper';
import { nFormatter } from 'shared_code/utils/shared.utils.ethers';
import { Button, CopyIcon, SortDirectionIcon } from 'components/UI/elements';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { LeaderboardData } from 'types';
import { exportCSVFile, getActiveVarColor } from 'helpers/functions';
import { formatTimeLeft } from 'helpers/parcels.helper';
import {
  OnChainFudIcon,
  OnChainFomoIcon,
  OnChainAlphaIcon,
  GotchiverseLogo,
  OnChainKekIcon,
  LeaderboardTitle,
  BackgroundSquarePattern,
} from 'assets';
import Image from 'next/image';
import Router from 'next/router';

const labels = [
  {
    label: 'rank',
    category: 'rank',
    param: 'sortRank',
  },
  {
    label: 'NAME',
    category: 'user',
    param: 'name',
  },
  {
    label: 'ID',
    category: 'user',
    param: 'id',
    sortKey: 'playerId',
  },

  {
    label: 'WALLET',
    category: 'user',
    param: 'address',
  },
  {
    label: 'K',
    category: 'score',
    param: 'kills',
    sortKey: 'kills',
  },
  {
    label: 'D',
    category: 'score',
    param: 'deaths',
    sortKey: 'deaths',
  },
  {
    label: 'H',
    category: 'score',
    param: 'hits',
    sortKey: 'hits',
  },
  {
    label: 'K-STREAK',
    category: 'report',
    param: 'bestKillStreak',
    sortKey: 'killStreak',
  },
  {
    label: 'K/D',
    category: 'report',
    param: 'killDeathRatio',
    sortKey: 'killDeathRatio',
  },
  {
    label: 'TIME ALIVE',
    category: 'report',
    param: 'sessionTime',
    sortKey: 'sessionTime',
  },
  {
    label: 'TTL DMG',
    category: 'totals',
    param: 'damageDealt',
    sortKey: 'damageDealt',
  },
  {
    label: 'ALCH',
    category: 'totals',
    param: 'alchemicaPickedUp',
    sortKey: 'alchemicaPickedUp',
  },
  /* hide enemy hits and kills from leaderboard until we actually have some
  {
    label: 'HIT',
    category: 'enemies',
    param: 'destructiblesHit',
  },
  {
    label: 'KILLED',
    category: 'enemies',
    param: 'destructiblesKilled',
  },
  */
  {
    label: 'VALUE',
    category: 'superchat',
    param: 'tipsValueSent',
    sortKey: 'tipsValueSent',
  },
  {
    label: 'TIPS',
    category: 'superchat',
    param: 'tips',
  },
];
const PAGE_LIMIT = 10;

export const LeaderboardScreen = (): JSX.Element => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData[]>();
  const [direction, setDirection] = useState({});
  const [sortSelected, setsortSelected] = useState<string>();
  const [filter, setFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const { click } = useAavegotchiSound();
  const byCategory = _.groupBy(labels, 'category');

  useEffect(() => {
    // Initial leaderboard API fetch
    void fetchAndSetLeaderboard();
  }, [page, filter, sortSelected, direction]);

  const fetchAndSetLeaderboard = async () => {
    const res = await getLeaderboardAll(filter, page - 1, PAGE_LIMIT, sortSelected, direction[sortSelected] ?? 'desc');
    setLeaderboard(transformRes(res?.leaderboard ?? []));
  };

  const transformRes = (leaderboard): LeaderboardData[] => {
    // First pick only props needed.
    const propsNeeded = _.keys(_.groupBy(labels, 'param'));
    leaderboard = _.map(leaderboard || [], (item) => _.pick(item, propsNeeded));
    const result = _.map(leaderboard, (item) => {
      const tips = item.tips || { FUD: 0, FOMO: 0, ALPHA: 0, KEK: 0 };
      const kd = Number(item.killDeathRatio);
      if (item.tipsValueSent) {
        item.tipsValueSent = nFormatter(item.tipsValueSent, 2);
      }
      return {
        ...item,
        alchemicaPickedUp: nFormatter((item.alchemicaPickedUp || 0) - (item.alchemicaDropped || 0), 2),
        killDeathRatio: (Number.isFinite(kd) ? kd : 0).toFixed(1),
        tips: {
          FUD: nFormatter(tips.FUD || 0, 2),
          FOMO: nFormatter(tips.FOMO || 0, 2),
          ALPHA: nFormatter(tips.ALPHA || 0, 2),
          KEK: nFormatter(tips.KEK || 0, 2),
        },
        tipsAverage: nFormatter(((tips.FUD || 0) + (tips.FOMO || 0) + (tips.ALPHA || 0) + (tips.KEK || 0)) / 4, 2),
      };
    });
    return result;
  };

  const pageUpdate = (int: number) => {
    let nextPage = page + int;
    if (nextPage <= 0) nextPage = 1;
    setPage(nextPage);
  };

  const handleCopy = (message: string): void => {
    void navigator.clipboard.writeText(message);
  };

  const handleSort = (sort: string): void => {
    if (!sort) return;
    click();
    const sortDirection = direction[sort] === 'asc' ? 'desc' : 'asc';
    setsortSelected(sort);
    setDirection({
      ...direction,
      [sort]: sortDirection,
    });
  };

  const onFilterChange = (e) => {
    setFilter(e.target.value);
  };

  useEffect(() => {
    const _direction = {};
    labels.forEach(({ sortKey }) => {
      if (sortKey) _direction[sortKey] = 'desc';
    });
    setDirection(_direction);
  }, []);

  return (
    <>
      <div className="leaderboard-screen">
        <header>
          <div className="logo-container">
            <div onClick={async () => await Router.push('/')} className="clickable">
              <Image alt="" objectFit="contain" src={GotchiverseLogo} />
            </div>
          </div>

          <div className="web3button-container">
            {/* <Web3Button handleLogout={handleLogout} jazzicon user={currentAccount} network={currentNetwork} /> */}
          </div>
        </header>
        <div
          className="bg absolute top-0 left-0 w-full h-full flex flex-col items-end justify-end"
          style={{
            zIndex: -1,
          }}
        >
          <Image alt="" objectFit="contain" objectPosition="bottom" src={BackgroundSquarePattern} />
        </div>
        <div className="w-full h-full pt-[2rem]">
          <div className="block md:flex md:items-center md:justify-between gap-[2rem] w-full">
            <div className="w-full max-w-2/3">
              <Image alt="" objectFit="contain" src={LeaderboardTitle} />
              <h1 className="title hidden">Leaderboard</h1>
            </div>
            <h2 className="subtitle w-full">SINCE APRIL 28</h2>
          </div>

          <div className="px-0">
            <label className="search-label">Gotchi ID or Wallet Address</label>
            <input className="search-input" type="string" placeholder="" value={filter} onChange={onFilterChange} />
          </div>
        </div>

        <div className="leaderboard-table">
          <div className="label-container row">
            {_.map(byCategory, (labels, category) => (
              <div key={category} className={`category ${category}`}>
                {_.map(labels, (label, key) => (
                  <div key={key} className={`cell ${label.param} flex items-center justify-center`}>
                    {label.param !== 'tips' && label.param !== 'tipsAverage' && <span className="label">{label.label}</span>}
                    {label.param === 'tips' && (
                      <div className="inline-flex items-center justify-around w-full h-full gap-1">
                        <Image alt="" src={OnChainFudIcon} width={16} height={16} />
                        <Image alt="" src={OnChainFomoIcon} width={16} height={16} />
                        <Image alt="" src={OnChainAlphaIcon} width={16} height={16} />
                        <Image alt="" src={OnChainKekIcon} width={16} height={16} />
                      </div>
                    )}
                    {label.sortKey && (
                      <div className="sort-container" onClick={() => label.param !== 'tips' && handleSort(label.sortKey)}>
                        <SortDirectionIcon
                          size={12}
                          direction={direction[label.sortKey]}
                          fill={getActiveVarColor('info', label.sortKey === sortSelected)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {!!leaderboard?.length && (
            <div className="users-content">
              {_.map(leaderboard, (user, index) => (
                <div className="row" key={index}>
                  {_.map(byCategory, (labels, category) => (
                    <div key={category} className={`category ${category}`}>
                      {_.map(labels, (label, key) => (
                        <div key={key} className={`cell ${label.param}`}>
                          {label.param !== 'tips' && label.param !== 'tipsAverage' && label.param !== 'address' && label.param !== 'sessionTime' && (
                            <span className="truncate">{user[label.param]}</span>
                          )}
                          {label.param !== 'tips' && label.param !== 'tipsAverage' && label.param === 'sessionTime' && (
                            <span className="">{formatTimeLeft(user[label.param], true)}</span>
                          )}
                          {label.param !== 'tips' && label.param !== 'tipsAverage' && label.param === 'address' && (
                            <>
                              <span className="">{smartTrim(user[label.param], 8)}</span>
                              <div className="copy-container clickable" onClick={() => handleCopy(user[label.param])}>
                                <CopyIcon fill={'var(--col-info-500)'} size={'12'} />
                              </div>
                            </>
                          )}
                          {label.param === 'tips' && (
                            <div className="flex items-center justify-around gap-1">
                              <div className="token-spent fud">{user[label.param].FUD}</div>
                              <div className="token-spent fomo">{user[label.param].FOMO}</div>
                              <div className="token-spent alpha">{user[label.param].ALPHA}</div>
                              <div className="token-spent kek">{user[label.param].KEK}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="page-buttons-container">
          <div className="buttons-wrapper">
            <div className="button-container">
              <button className="page-button back" onClick={() => pageUpdate(-1)}>
                {'< Prev'}
              </button>
            </div>
            <div className="button-container">
              <button className="page-button active" onClick={() => pageUpdate(0)}>
                {` ${PAGE_LIMIT * page - PAGE_LIMIT + 1} - ${PAGE_LIMIT * page}`}
              </button>
            </div>

            <div className="button-container">
              <button className="page-button" onClick={() => pageUpdate(1)}>
                {` ${PAGE_LIMIT * page + 1} - ${PAGE_LIMIT * page + PAGE_LIMIT}`}
              </button>
            </div>
            <div className="button-container">
              <button className="page-button" onClick={() => pageUpdate(2)}>
                {`${PAGE_LIMIT * page + PAGE_LIMIT + 1} - ${PAGE_LIMIT * page + PAGE_LIMIT * 2}`}
              </button>
            </div>
            <div className="button-container">
              <button className="page-button" onClick={() => pageUpdate(1)}>
                {'Next >'}
              </button>
            </div>
          </div>
          <Button color={'info'} size={2.2} onClick={() => exportCSVFile(leaderboard, 'leaderboard')}>
            Export to CSV
          </Button>
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
