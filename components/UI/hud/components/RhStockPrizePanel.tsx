import { useCallback, useEffect, useState } from 'react';
import { useUser } from 'contexts/UserContext';
import { useWeb3 } from 'contexts/Web3Context';
import { isColyseusAarenaMap } from 'helpers/colyseus.map';
import { getAarcadeGamesCatalogUrl } from 'helpers/auth.helper';

/** Pocket currencies paid out by the RH weekly stock tournament (one per brand ticker). */
const PRIZE_CURRENCIES = ['nvda', 'aapl', 'amzn', 'dis', 'gme', 'msft', 'nke', 'spacex', 'tsla', 'uso'];

function formatUnits(raw: string | undefined): string {
  try {
    const bi = BigInt(String(raw || '0').split('.')[0] || '0');
    const scale = BigInt('1000000000000000000');
    const whole = bi / scale;
    const frac = bi % scale;
    const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '').slice(0, 6);
    return fracStr ? `${whole}.${fracStr}` : whole.toString();
  } catch {
    return '0';
  }
}

type RoundState = {
  roundId: string;
  endsAt: number;
  remainingMs: number;
  roundMs: number;
  leaders: Array<{ address: string; kos: number; damage: number }>;
};
type TourneyStatus = {
  weekKey?: string;
  standing?: { rank: number; roundWins: number; kos: number; score: number; ticker?: string | null } | null;
  cartridges?: Array<{
    cartridgeId: string;
    retiredHeroes?: Array<{ collateral?: string; retired?: { weekKey?: string } }>;
  }>;
};

function fmtRemaining(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function shortWeek(weekKey?: string): string {
  return String(weekKey || '').replace('weekly_', '').replace('-pacific', '');
}

/** RH aarena: SIM prize pockets (NVDA drip + tournament baskets), round timer and weekly standing. */
export function RhStockPrizePanel(): JSX.Element | null {
  const [{ currentAccount, currentNetwork }] = useWeb3();
  const [{ cartridgeId, hasCartridge }] = useUser();
  const [pocket, setPocket] = useState<Record<string, string>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [round, setRound] = useState<RoundState | null>(null);
  const [roundReceivedAt, setRoundReceivedAt] = useState(0);
  const [tick, setTick] = useState(Date.now());
  const [tourney, setTourney] = useState<TourneyStatus | null>(null);

  const show = currentNetwork === 'robinhood' && isColyseusAarenaMap();

  const refresh = useCallback(async () => {
    if (!currentAccount || !cartridgeId) {
      setPocket({});
      setPendingCount(0);
      return;
    }
    try {
      const qs = new URLSearchParams({ wallet: currentAccount, cartridgeId: String(cartridgeId) });
      const res = await fetch(`/api/aarcade-cartridge-pocket?${qs}`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) return;
      setPocket((data?.pocket || {}) as Record<string, string>);
      setPendingCount(Array.isArray(data?.pendingWithdrawals) ? data.pendingWithdrawals.length : 0);
    } catch {
      /* ignore */
    }
  }, [currentAccount, cartridgeId]);

  const refreshTourney = useCallback(async () => {
    if (!currentAccount) {
      setTourney(null);
      return;
    }
    try {
      const res = await fetch(`/api/aarcade-rh-tourney?path=players/${currentAccount}/status`, {
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) setTourney(data as TourneyStatus);
    } catch {
      /* ignore */
    }
  }, [currentAccount]);

  useEffect(() => {
    if (!show) return;
    void refresh();
    void refreshTourney();
    const onUp = () => void refresh();
    const onRound = (e: Event) => {
      setRound((e as CustomEvent<RoundState>).detail || null);
      setRoundReceivedAt(Date.now());
    };
    const onRoundEnd = () => {
      // standings land a few seconds after the realm reports the round
      setTimeout(() => void refreshTourney(), 4000);
    };
    window.addEventListener('rh-pocket-updated', onUp);
    window.addEventListener('rh-round-state', onRound);
    window.addEventListener('rh-round-end', onRoundEnd);
    const t = setInterval(() => void refresh(), 15_000);
    const t2 = setInterval(() => void refreshTourney(), 60_000);
    const t3 = setInterval(() => setTick(Date.now()), 1000);
    return () => {
      window.removeEventListener('rh-pocket-updated', onUp);
      window.removeEventListener('rh-round-state', onRound);
      window.removeEventListener('rh-round-end', onRoundEnd);
      clearInterval(t);
      clearInterval(t2);
      clearInterval(t3);
    };
  }, [show, refresh, refreshTourney]);

  const withdrawAll = async (token: string) => {
    if (!currentAccount || !cartridgeId || busy) return;
    const amount = pocket[token];
    if (!amount || amount === '0') return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/api/aarcade-cartridge-pocket', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ wallet: currentAccount, cartridgeId, token, amount }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setNote(data?.error || 'Withdraw failed');
      } else {
        setNote('Withdraw marked sim_pending — onchain claim ships with the tournament’s real rails.');
        void refresh();
      }
    } catch {
      setNote('Withdraw failed');
    } finally {
      setBusy(false);
    }
  };

  if (!show) return null;

  const prizeRows = PRIZE_CURRENCIES.filter((c) => pocket[c] && pocket[c] !== '0');
  const remainingMs = round ? Math.max(0, round.remainingMs - (tick - roundReceivedAt)) : 0;
  const retired = (tourney?.cartridges || []).flatMap((c) => c.retiredHeroes || []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 72,
        right: 16,
        zIndex: 40,
        minWidth: 220,
        maxWidth: 280,
        padding: '10px 12px',
        background: 'rgba(12, 8, 28, 0.88)',
        border: '1px solid rgba(180, 140, 255, 0.45)',
        borderRadius: 8,
        color: '#efe8ff',
        fontSize: 13,
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>RH Stock Tournament</div>

      {round && (
        <div style={{ marginBottom: 8, padding: '6px 8px', background: 'rgba(91, 60, 196, 0.25)', borderRadius: 6 }}>
          <div>
            Round ends in <strong>{fmtRemaining(remainingMs)}</strong>
          </div>
          {round.leaders?.length > 0 && (
            <div style={{ opacity: 0.85, fontSize: 11, marginTop: 4 }}>
              {round.leaders.slice(0, 3).map((l, i) => (
                <div key={l.address}>
                  {i + 1}. {l.address.slice(0, 6)}… {l.kos} KO · {Math.round(l.damage)} dmg
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tourney && (
        <div style={{ marginBottom: 8, fontSize: 12 }}>
          {tourney.standing ? (
            <div>
              Week {shortWeek(tourney.weekKey)}: <strong>#{tourney.standing.rank}</strong> · {tourney.standing.roundWins} wins ·{' '}
              {tourney.standing.kos} KOs · score {tourney.standing.score}
            </div>
          ) : (
            <div style={{ opacity: 0.8 }}>No accepted wins yet this week — win a round to get on the board.</div>
          )}
          {retired.length > 0 && (
            <div style={{ opacity: 0.8, marginTop: 4 }}>
              Retired:{' '}
              {retired.map((h) => `${h.collateral || 'hero'} (${shortWeek(h.retired?.weekKey)})`).join(', ')} — mint again
              to re-enter.
            </div>
          )}
        </div>
      )}

      {!hasCartridge || !cartridgeId ? (
        <div>
          <div style={{ opacity: 0.85, marginBottom: 8 }}>
            Mint a brand cAavegotchi on an Aarcade cartridge to compete for stock prizes.
          </div>
          <a href={getAarcadeGamesCatalogUrl()} target="_blank" rel="noreferrer" style={{ color: '#c4a8ff' }}>
            Open catalog
          </a>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 6 }}>
            {prizeRows.length === 0 ? (
              <span style={{ opacity: 0.8 }}>No stock prizes in pocket yet.</span>
            ) : (
              prizeRows.map((c) => (
                <div
                  key={c}
                  style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 4 }}
                >
                  <span>
                    {c.toUpperCase()}: <strong>{formatUnits(pocket[c])}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void withdrawAll(c)}
                    style={{
                      padding: '3px 8px',
                      fontSize: 11,
                      cursor: busy ? 'not-allowed' : 'pointer',
                      background: '#5b3cc4',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                    }}
                  >
                    Withdraw
                  </button>
                </div>
              ))
            )}
          </div>
          {pendingCount > 0 && <div style={{ opacity: 0.8, marginBottom: 6 }}>{pendingCount} pending withdrawal(s)</div>}
          {note && <div style={{ marginTop: 6, opacity: 0.85, fontSize: 11 }}>{note}</div>}
        </>
      )}
    </div>
  );
}
