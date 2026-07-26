import { useCallback, useEffect, useState } from 'react';
import { useUser } from 'contexts/UserContext';
import { useWeb3 } from 'contexts/Web3Context';
import { isColyseusAarenaMap } from 'helpers/colyseus.map';
import { getAarcadeGamesCatalogUrl } from 'helpers/auth.helper';

function formatNvda(raw: string | undefined): string {
  try {
    const bi = BigInt(String(raw || '0').split('.')[0] || '0');
    const scale = BigInt(10) ** BigInt(18);
    const whole = bi / scale;
    const frac = bi % scale;
    const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '').slice(0, 6);
    return fracStr ? `${whole}.${fracStr}` : whole.toString();
  } catch {
    return '0';
  }
}

/** RH aarena SIM NVDA pocket + withdraw (pending until onchain vault). */
export function RhStockPrizePanel(): JSX.Element | null {
  const [{ currentAccount, currentNetwork }] = useWeb3();
  const [{ cartridgeId, hasCartridge }] = useUser();
  const [nvda, setNvda] = useState('0');
  const [pendingCount, setPendingCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const show = currentNetwork === 'robinhood' && isColyseusAarenaMap();

  const refresh = useCallback(async () => {
    if (!currentAccount || !cartridgeId) {
      setNvda('0');
      setPendingCount(0);
      return;
    }
    try {
      const qs = new URLSearchParams({
        wallet: currentAccount,
        cartridgeId: String(cartridgeId),
      });
      const res = await fetch(`/api/aarcade-cartridge-pocket?${qs}`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) return;
      setNvda(String(data?.pocket?.nvda || '0'));
      setPendingCount(Array.isArray(data?.pendingWithdrawals) ? data.pendingWithdrawals.length : 0);
    } catch {
      /* ignore */
    }
  }, [currentAccount, cartridgeId]);

  useEffect(() => {
    if (!show) return;
    void refresh();
    const onUp = () => void refresh();
    window.addEventListener('rh-pocket-updated', onUp);
    const t = setInterval(() => void refresh(), 15_000);
    return () => {
      window.removeEventListener('rh-pocket-updated', onUp);
      clearInterval(t);
    };
  }, [show, refresh]);

  const withdrawAll = async () => {
    if (!currentAccount || !cartridgeId || busy) return;
    const amount = nvda;
    if (!amount || amount === '0') return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/api/aarcade-cartridge-pocket', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          wallet: currentAccount,
          cartridgeId,
          token: 'nvda',
          amount,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setNote(data?.error || 'Withdraw failed');
      } else {
        setNote('Withdraw marked sim_pending — onchain RH claim in phase 2.');
        void refresh();
      }
    } catch {
      setNote('Withdraw failed');
    } finally {
      setBusy(false);
    }
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 72,
        right: 16,
        zIndex: 40,
        minWidth: 200,
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
      <div style={{ fontWeight: 700, marginBottom: 6 }}>RH Stock Prize (SIM)</div>
      {!hasCartridge || !cartridgeId ? (
        <div>
          <div style={{ opacity: 0.85, marginBottom: 8 }}>Need an Aarcade cartridge to earn NVDA.</div>
          <a href={getAarcadeGamesCatalogUrl()} target="_blank" rel="noreferrer" style={{ color: '#c4a8ff' }}>
            Open catalog
          </a>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 6 }}>
            Pocket NVDA: <strong>{formatNvda(nvda)}</strong>
          </div>
          {pendingCount > 0 && (
            <div style={{ opacity: 0.8, marginBottom: 6 }}>{pendingCount} pending withdrawal(s)</div>
          )}
          <button
            type="button"
            disabled={busy || nvda === '0'}
            onClick={() => void withdrawAll()}
            style={{
              width: '100%',
              padding: '6px 8px',
              cursor: busy || nvda === '0' ? 'not-allowed' : 'pointer',
              background: '#5b3cc4',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
            }}
          >
            {busy ? 'Withdrawing…' : 'Withdraw (SIM pending)'}
          </button>
          {note && <div style={{ marginTop: 6, opacity: 0.85, fontSize: 11 }}>{note}</div>}
        </>
      )}
    </div>
  );
}
