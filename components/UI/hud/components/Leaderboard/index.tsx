import { useCallback, useEffect, useState } from 'react';
import { useRealm } from 'contexts/RealmContext';
import { LeaderboardData } from 'types';
import ExitAarena from './ExitAarena';
import InGame from './InGame';

interface Props {
  layout: 'ingame' | 'exit';
  limit?: number;
  excludePlayer?: boolean;
}

function normalizeRows(leaderboard: LeaderboardData[] | undefined, player: LeaderboardData | null | undefined): LeaderboardData[] {
  const top = (leaderboard || []).filter(Boolean);
  if (!player) return top;
  // Avoid duplicating local player when they are already in the top slice.
  const withoutSelf = top.filter((row) => String(row?.id) !== String(player.id));
  return [...withoutSelf, player];
}

export const Leaderboard = ({ layout = 'ingame', excludePlayer, limit = 4 }: Props) => {
  const [{ selectedPlayer }] = useRealm();
  const [data, setData] = useState<LeaderboardData[]>([]);
  const [fetching, setFetching] = useState(false);

  const fetchAndSetLeaderboard = useCallback(
    async (id: string) => {
      setFetching(true);
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_COLYSEUS_URL || '').replace(/\/$/, '');
        if (!base) {
          setData([]);
          return;
        }
        const queryStr = excludePlayer ? `limit=${limit}` : `gotchi=${encodeURIComponent(id)}&limit=${limit}`;
        const res = await fetch(`${base}/leaderboard/all?${queryStr}`);
        if (res.status === 200) {
          const body = await res.json();
          setData(normalizeRows(body?.leaderboard, body?.player));
        } else {
          setData([]);
        }
      } catch (error) {
        console.error('@fetchAndSetLeaderboard:ERR', error);
        setData([]);
      } finally {
        setFetching(false);
      }
    },
    [excludePlayer, limit],
  );

  const updateData = useCallback(() => {
    if (selectedPlayer?.id) {
      void fetchAndSetLeaderboard(String(selectedPlayer.id));
    }
  }, [selectedPlayer?.id, fetchAndSetLeaderboard]);

  useEffect(() => {
    updateData();
  }, [updateData]);

  useEffect(() => {
    const id = setInterval(updateData, 15 * 1000);
    return () => clearInterval(id);
  }, [updateData]);

  useEffect(() => {
    const onKo = () => updateData();
    window.addEventListener('aarena-leaderboard-refresh', onKo);
    return () => window.removeEventListener('aarena-leaderboard-refresh', onKo);
  }, [updateData]);

  return layout === 'ingame' ? <InGame fetching={fetching} data={data} /> : <ExitAarena fetching={fetching} data={data} />;
};
