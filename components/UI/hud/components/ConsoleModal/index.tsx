import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { SoftCText } from 'components/UI/widgets';
import { useUI } from 'contexts/UIContexts';
import { useWeb3 } from 'contexts/Web3Context';
import InputController from 'components/controllers/inputController';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import {
  CONSOLE_AARCADE_GAMES,
  buildConsoleEmbedUrl,
  consoleLevelFromItemId,
  consoleTitleCapacity,
  getLocalConsoleUpgradeInfo,
  isConsoleTitleUnlimited,
  loadTitleOntoConsole,
  normalizeLoadedTitles,
  playableConsoleGames,
} from 'helpers/console.installation.helper';
import {
  ensureAarcadeCartridge,
  getAarcadeCartridgeStatus,
  getAarcadeGamesCatalogUrl,
  type AarcadeCartridgeListItem,
} from 'helpers/auth.helper';
import {
  loadStoreLayout,
  serializeLayout,
  setConsoleLoadedTitles,
  upgradeConsoleFurniture,
} from 'helpers/store.layout.helper';
import {
  loadLodgeLayout,
  serializeLodgeLayout,
  setConsoleLoadedTitles as setLodgeConsoleLoadedTitles,
  upgradeConsoleFurniture as upgradeLodgeConsoleFurniture,
} from 'helpers/lodge.layout.helper';
import { publishStoreLayout } from 'helpers/colyseus.store';
import { publishLodgeLayout } from 'helpers/colyseus.lodge';
import styles from './styles';

type ConsoleStep = 'games' | 'manage' | 'cartridges' | 'playing';

function shortId(id: string): string {
  const s = String(id || '');
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function formatCreatedAt(raw?: string | null): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCapacity(cap: number): string {
  return Number.isFinite(cap) ? String(cap) : '∞';
}

export const ConsoleModal = (): JSX.Element => {
  const [{ consoleState }, uiDispatch] = useUI();
  const [{ currentAccount }] = useWeb3();
  const { click } = useAavegotchiSound();
  const [step, setStep] = useState<ConsoleStep>('games');
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [gameCartridgeId, setGameCartridgeId] = useState<string | null>(null);
  const [cartridgeChoices, setCartridgeChoices] = useState<AarcadeCartridgeListItem[]>([]);
  const [loadedTitles, setLoadedTitles] = useState<string[]>([]);
  const [itemId, setItemId] = useState<number>(0);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const open = Boolean(consoleState?.open);
  const furnitureId = consoleState?.furnitureId || consoleState?.installationId;
  const storeId = consoleState?.storeId;
  const lodgeId = consoleState?.lodgeId;
  const layoutHostId = lodgeId || storeId;
  const inLodge = Boolean(lodgeId);
  const isOwner = Boolean(consoleState?.isOwner);

  const level = consoleLevelFromItemId(itemId);
  const capacity = consoleTitleCapacity(itemId);
  const unlimited = isConsoleTitleUnlimited(itemId);
  const upgradeInfo = itemId ? getLocalConsoleUpgradeInfo(itemId) : null;

  const playGames = useMemo(
    () => playableConsoleGames({ itemId, loadedTitles }),
    [itemId, loadedTitles],
  );

  const loadableGames = useMemo(() => {
    const loaded = new Set(loadedTitles);
    return CONSOLE_AARCADE_GAMES.filter((g) => !loaded.has(g.id));
  }, [loadedTitles]);

  const pendingGameName = useMemo(() => {
    const id = pendingGameId || activeGameId;
    return CONSOLE_AARCADE_GAMES.find((g) => g.id === id)?.name || id || '';
  }, [pendingGameId, activeGameId]);

  const embedUrl = useMemo(() => {
    if (!activeGameId || !gameCartridgeId) return '';
    return buildConsoleEmbedUrl({
      gameId: activeGameId,
      playerId: currentAccount,
      cartridgeId: gameCartridgeId,
    });
  }, [activeGameId, currentAccount, gameCartridgeId]);

  const resetFlow = () => {
    setStep('games');
    setPendingGameId(null);
    setActiveGameId(null);
    setGameCartridgeId(null);
    setCartridgeChoices([]);
    setLaunchBusy(false);
    setLaunchError(null);
    setStatusMsg(null);
  };

  const syncFromState = () => {
    setLoadedTitles(normalizeLoadedTitles(consoleState?.loadedTitles));
    setItemId(Number(consoleState?.itemId || 0));
  };

  useEffect(() => {
    if (!open) {
      resetFlow();
      return;
    }
    syncFromState();
    InputController.updateDisableKeyboard(true);
  }, [open, consoleState?.furnitureId, consoleState?.itemId, consoleState?.loadedTitles]);

  const pushConsoleState = (next: {
    itemId?: number;
    loadedTitles?: string[];
  }) => {
    uiDispatch({
      type: 'UPDATE_CONSOLE_MODAL',
      consoleState: {
        ...consoleState,
        open: true,
        furnitureId: furnitureId,
        installationId: furnitureId,
        storeId: inLodge ? undefined : storeId,
        lodgeId: inLodge ? lodgeId : undefined,
        isOwner,
        itemId: next.itemId ?? itemId,
        loadedTitles: next.loadedTitles ?? loadedTitles,
      },
    });
  };

  const persistLayout = (
    layoutUpdater: () => {
      ok: boolean;
      message: string;
      layout: ReturnType<typeof loadStoreLayout> | ReturnType<typeof loadLodgeLayout>;
    },
  ): {
    ok: boolean;
    message: string;
    layout?: ReturnType<typeof loadStoreLayout> | ReturnType<typeof loadLodgeLayout>;
  } => {
    if (!layoutHostId || !furnitureId) {
      return { ok: false, message: 'Missing Console context' };
    }
    if (inLodge) loadLodgeLayout(layoutHostId);
    else loadStoreLayout(layoutHostId);
    const result = layoutUpdater();
    if (result.ok) {
      if (inLodge) publishLodgeLayout(serializeLodgeLayout(result.layout as ReturnType<typeof loadLodgeLayout>));
      else publishStoreLayout(serializeLayout(result.layout as ReturnType<typeof loadStoreLayout>));
    }
    return result;
  };

  const close = () => {
    click();
    resetFlow();
    uiDispatch({
      type: 'UPDATE_CONSOLE_MODAL',
      consoleState: {
        open: false,
        furnitureId: undefined,
        installationId: undefined,
        storeId: undefined,
        lodgeId: undefined,
        itemId: undefined,
        loadedTitles: undefined,
        isOwner: false,
      },
    });
    // Keep keyboard disabled while StoreModal/LodgeModal is still open.
  };

  const launchWithCartridge = (gameId: string, cartridgeId: string) => {
    setGameCartridgeId(cartridgeId);
    setActiveGameId(gameId);
    setPendingGameId(gameId);
    setStep('playing');
  };

  const playGame = async (gameId: string) => {
    click();
    setLaunchError(null);
    if (!currentAccount) {
      setLaunchError('Connect your wallet to play Console games.');
      return;
    }

    setLaunchBusy(true);
    setPendingGameId(gameId);
    try {
      const status = await getAarcadeCartridgeStatus(currentAccount, {
        gameId,
        fresh: true,
      });
      let choices = status?.cartridges?.length
        ? status.cartridges
        : status?.cartridgeId
          ? [
              {
                cartridgeId: status.cartridgeId,
                gameId,
                heroCount: status.heroes?.length || 0,
                heroLabel: status.heroes?.[0]?.id || null,
                activeCAavegotchiId: status.activeCAavegotchiId || null,
              } satisfies AarcadeCartridgeListItem,
            ]
          : [];

      if (choices.length === 0) {
        const ensured = await ensureAarcadeCartridge(currentAccount, { gameId });
        if (ensured.ok && ensured.cartridgeId) {
          choices = [
            {
              cartridgeId: ensured.cartridgeId,
              gameId,
              heroCount: ensured.heroes?.length || 0,
              heroLabel: ensured.heroes?.[0]?.id || null,
              activeCAavegotchiId: null,
            },
          ];
        } else {
          setLaunchError(
            ensured.error ||
              `No cartridge for ${gameId}. Mint one on Aarcade Games first.`,
          );
          setPendingGameId(null);
          return;
        }
      }

      if (choices.length === 1) {
        launchWithCartridge(gameId, choices[0].cartridgeId);
        return;
      }

      setCartridgeChoices(choices);
      setStep('cartridges');
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : 'Failed to launch game');
      setPendingGameId(null);
    } finally {
      setLaunchBusy(false);
    }
  };

  const selectCartridge = (cartridgeId: string) => {
    click();
    if (!pendingGameId) return;
    launchWithCartridge(pendingGameId, cartridgeId);
  };

  const handleLoadTitle = (gameId: string) => {
    if (!isOwner || !layoutHostId || !furnitureId) return;
    click();
    const check = loadTitleOntoConsole({ itemId, loadedTitles }, gameId);
    if (!check.ok) {
      setStatusMsg(check.message);
      return;
    }
    const result = persistLayout(() =>
      inLodge
        ? setLodgeConsoleLoadedTitles(loadLodgeLayout(layoutHostId), furnitureId, check.loadedTitles)
        : setConsoleLoadedTitles(loadStoreLayout(layoutHostId), furnitureId, check.loadedTitles),
    );
    setStatusMsg(result.message);
    if (result.ok) {
      setLoadedTitles(check.loadedTitles);
      pushConsoleState({ loadedTitles: check.loadedTitles });
    }
  };

  const handleUpgrade = () => {
    if (!isOwner || !layoutHostId || !furnitureId) return;
    click();
    const result = persistLayout(() =>
      inLodge
        ? upgradeLodgeConsoleFurniture(loadLodgeLayout(layoutHostId), furnitureId)
        : upgradeConsoleFurniture(loadStoreLayout(layoutHostId), furnitureId),
    );
    setStatusMsg(result.message);
    if (result.ok) {
      const piece = result.layout?.furniture.find((f) => f.id === furnitureId);
      if (piece) {
        setItemId(piece.itemId);
        setLoadedTitles(normalizeLoadedTitles(piece.loadedTitles));
        pushConsoleState({ itemId: piece.itemId, loadedTitles: normalizeLoadedTitles(piece.loadedTitles) });
      }
    }
  };

  const backToGames = () => {
    click();
    setStep('games');
    setPendingGameId(null);
    setActiveGameId(null);
    setGameCartridgeId(null);
    setLaunchError(null);
  };

  const backToCartridges = () => {
    click();
    setActiveGameId(null);
    setGameCartridgeId(null);
    if (cartridgeChoices.length > 1) {
      setStep('cartridges');
    } else {
      setStep('games');
    }
  };

  if (!open) return null;

  const modalTitle =
    step === 'playing' && activeGameId
      ? `Console · ${activeGameId}`
      : step === 'cartridges'
        ? `Console · ${pendingGameName || 'Cartridge'}`
        : step === 'manage'
          ? 'Console · Manage titles'
          : `Console L${level || '?'}`;

  return (
    <>
      <Modal title={modalTitle} open={open} onClose={close} light>
        <div className={`console-modal ${step === 'playing' ? 'playing' : ''}`}>
          <div className="console-header">
            <div className="console-title">
              <SoftCText>
                {step === 'playing'
                  ? 'Unity Player'
                  : step === 'cartridges'
                    ? 'Select a cartridge'
                    : step === 'manage'
                      ? 'Load titles'
                      : 'Select a game'}
              </SoftCText>
            </div>
            <div className="console-actions">
              {step === 'playing' ? (
                <Button size={2} onClick={backToCartridges}>
                  {cartridgeChoices.length > 1 ? 'Cartridges' : 'Games'}
                </Button>
              ) : null}
              {step === 'cartridges' || step === 'manage' ? (
                <Button size={2} onClick={backToGames}>
                  Games
                </Button>
              ) : null}
              {step === 'games' && isOwner ? (
                <Button size={2} onClick={() => { click(); setStep('manage'); }}>
                  Manage
                </Button>
              ) : null}
            </div>
          </div>

          {step === 'games' ? (
            <>
              <p className="console-meta">
                L{level}
                {unlimited
                  ? ' · any owned soft-launch title'
                  : ` · slots ${loadedTitles.length}/${formatCapacity(capacity)}`}
                {currentAccount ? ` · ${currentAccount.slice(0, 6)}…${currentAccount.slice(-4)}` : ''}
              </p>
              {launchError ? <p className="console-error">{launchError}</p> : null}
              {launchError ? (
                <p className="console-meta">
                  <a href={getAarcadeGamesCatalogUrl()} target="_blank" rel="noreferrer">
                    Open Aarcade Games catalog
                  </a>
                </p>
              ) : null}
              {!playGames.length ? (
                <p className="console-error">
                  No titles loaded on this Console.
                  {isOwner ? ' Open Manage to unlock a title.' : ' Ask the owner to load games.'}
                </p>
              ) : (
                <div className="console-grid">
                  {playGames.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      className="console-game-card"
                      disabled={launchBusy}
                      onClick={() => playGame(game.id)}
                    >
                      <span className="game-name">{game.name}</span>
                      {game.tag ? <span className="game-tag">{game.tag}</span> : null}
                      <span className="game-play">{launchBusy && pendingGameId === game.id ? '…' : 'Play'}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : null}

          {step === 'manage' ? (
            <>
              <p className="console-meta">
                Loaded {loadedTitles.length}/{formatCapacity(capacity)}
                {unlimited ? ' (L9 unlimited play — slots still track unlocks)' : ''}
              </p>
              {statusMsg ? <p className="console-meta">{statusMsg}</p> : null}
              <div className="console-loaded-list">
                {loadedTitles.length ? (
                  loadedTitles.map((id) => (
                    <div key={id} className="console-loaded-row">
                      {CONSOLE_AARCADE_GAMES.find((g) => g.id === id)?.name || id}
                    </div>
                  ))
                ) : (
                  <p className="console-meta">No titles loaded yet.</p>
                )}
              </div>
              {(!Number.isFinite(capacity) || loadedTitles.length < capacity) && loadableGames.length ? (
                <>
                  <p className="console-meta">Load an empty slot:</p>
                  <div className="console-grid">
                    {loadableGames.map((game) => (
                      <button
                        key={game.id}
                        type="button"
                        className="console-game-card"
                        onClick={() => handleLoadTitle(game.id)}
                      >
                        <span className="game-name">{game.name}</span>
                        <span className="game-play">Load</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="console-meta">
                  {Number.isFinite(capacity) && loadedTitles.length >= capacity
                    ? 'All slots full — upgrade Console for more.'
                    : 'All catalog titles already loaded.'}
                </p>
              )}
              {upgradeInfo?.next ? (
                <div className="console-upgrade">
                  <Button size={2} onClick={handleUpgrade}>
                    Upgrade to L{upgradeInfo.next.level} (slots{' '}
                    {formatCapacity(upgradeInfo.next.titleCapacity)})
                  </Button>
                </div>
              ) : (
                <p className="console-meta">Max level Console.</p>
              )}
            </>
          ) : null}

          {step === 'cartridges' ? (
            <>
              <p className="console-meta">
                {pendingGameName} · {cartridgeChoices.length} cartridges — pick which save to load
              </p>
              <div className="console-grid">
                {cartridgeChoices.map((cart, i) => {
                  const created = formatCreatedAt(cart.createdAt);
                  return (
                    <button
                      key={cart.cartridgeId}
                      type="button"
                      className="console-game-card"
                      onClick={() => selectCartridge(cart.cartridgeId)}
                    >
                      <span className="game-name">Cartridge {i + 1}</span>
                      <span className="game-tag">{shortId(cart.cartridgeId)}</span>
                      {cart.heroLabel ? (
                        <span className="console-cart-detail">Hero · {cart.heroLabel}</span>
                      ) : (
                        <span className="console-cart-detail">
                          {cart.heroCount > 0 ? `${cart.heroCount} hero(s)` : 'No hero bound'}
                        </span>
                      )}
                      {created ? <span className="console-cart-detail">Created · {created}</span> : null}
                      <span className="game-play">Play</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === 'playing' ? (
            <div className="console-player">
              {embedUrl ? (
                <iframe
                  key={embedUrl}
                  title={`Aarcade ${activeGameId}`}
                  src={embedUrl}
                  className="console-iframe"
                  allow="autoplay; fullscreen; gamepad; clipboard-write"
                  allowFullScreen
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </Modal>
      <style jsx>{styles}</style>
    </>
  );
};
